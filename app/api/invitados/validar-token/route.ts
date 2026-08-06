import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { validarTokenSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validarTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ existe: false, mensaje: "Solicitud inválida" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: invitado } = await supabase
    .from("invitados")
    .select("nombre, token_expira_at, estado, max_acompanantes")
    .eq("magic_token", parsed.data.token)
    .maybeSingle();

  if (!invitado) {
    return NextResponse.json({ existe: false, mensaje: "Invitación no encontrada" }, { status: 404 });
  }

  const expirado = new Date(invitado.token_expira_at) < new Date();

  return NextResponse.json({
    existe: true,
    nombre: invitado.nombre,
    estado: invitado.estado,
    max_acompanantes: invitado.max_acompanantes,
    token_valido: !expirado,
    mensaje: expirado ? "Esta invitación ha expirado" : "Invitación válida",
  });
}
