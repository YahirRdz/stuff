import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { generarPin, hashPin } from "@/lib/crypto";
import { enviarInvitacion } from "@/lib/email";
import { registrarEvento } from "@/lib/historial";
import { MAGIC_TOKEN_EXPIRA_DIAS } from "@/lib/constants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const { data: invitado, error: fetchError } = await auth.supabase
    .from("invitados")
    .select("id, nombre, email, magic_token, boda_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !invitado) {
    return NextResponse.json({ mensaje: "Invitado no encontrado" }, { status: 404 });
  }

  const { data: boda } = await auth.supabase
    .from("bodas")
    .select("nombre")
    .eq("id", invitado.boda_id)
    .maybeSingle();

  const nuevoPin = generarPin();
  const nuevoPinHash = await hashPin(nuevoPin);
  const nuevaExpiracion = new Date(Date.now() + MAGIC_TOKEN_EXPIRA_DIAS * 86_400_000).toISOString();

  const { error: updateError } = await auth.supabase
    .from("invitados")
    .update({
      pin_hash: nuevoPinHash,
      pin_intentos: 0,
      pin_bloqueado_hasta: null,
      token_expira_at: nuevaExpiracion,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ mensaje: updateError.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const link = `${baseUrl}/confirmar/${invitado.magic_token}`;
  const nombreBoda = boda?.nombre ?? "la boda";

  await enviarInvitacion({ to: invitado.email, nombre: invitado.nombre, link, pin: nuevoPin, nombreBoda });

  await registrarEvento({
    supabase: auth.supabase,
    invitadoId: id,
    evento: "reenviado",
  });

  return NextResponse.json({ reenviado: true, email: invitado.email });
}
