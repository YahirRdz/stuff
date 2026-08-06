import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { crearInvitadosBatchSchema } from "@/lib/schemas";
import { generarPin, hashPin } from "@/lib/crypto";
import { enviarInvitacion } from "@/lib/email";

const listQuerySchema = z.object({
  boda_id: z.string().uuid(),
  estado: z.enum(["pending", "confirmed", "declined", "attended", "no_show"]).optional(),
  buscar: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    boda_id: searchParams.get("boda_id"),
    estado: searchParams.get("estado") ?? undefined,
    buscar: searchParams.get("buscar") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ mensaje: "Parámetros inválidos" }, { status: 400 });
  }

  let query = auth.supabase
    .from("invitados")
    .select(
      "id, nombre, email, telefono, estado, max_acompanantes, num_acompanantes, restricciones_dieteticas, comentarios, confirmado_at, magic_token, creado_at"
    )
    .eq("boda_id", parsed.data.boda_id)
    .order("creado_at", { ascending: false });

  if (parsed.data.estado) query = query.eq("estado", parsed.data.estado);
  if (parsed.data.buscar) query = query.ilike("nombre", `%${parsed.data.buscar}%`);

  const { data: invitados, error } = await query;
  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });

  const stats = {
    total: invitados.length,
    confirmados: invitados.filter((i) => i.estado === "confirmed").length,
    pendientes: invitados.filter((i) => i.estado === "pending").length,
    declinados: invitados.filter((i) => i.estado === "declined").length,
    total_asistentes_confirmados: invitados
      .filter((i) => i.estado === "confirmed")
      .reduce((sum, i) => sum + 1 + (i.num_acompanantes ?? 0), 0),
  };

  return NextResponse.json({ ...stats, invitados });
}

const crearBatchBodySchema = z.object({
  boda_id: z.string().uuid(),
  nombre_boda: z.string().trim().min(1),
  invitados: crearInvitadosBatchSchema,
  enviar_email: z.boolean().default(true),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = crearBatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ mensaje: "Solicitud inválida", errores: parsed.error.flatten() }, { status: 400 });
  }

  const { boda_id, nombre_boda, invitados, enviar_email } = parsed.data;

  const creados: { id: string; nombre: string; email: string; token: string; pin: string; link: string }[] = [];
  const fallidos: { nombre: string; email: string; error: string }[] = [];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  for (const invitado of invitados) {
    const pin = generarPin();
    const pinHash = await hashPin(pin);

    const { data, error } = await auth.supabase
      .from("invitados")
      .insert({
        boda_id,
        nombre: invitado.nombre,
        email: invitado.email,
        telefono: invitado.telefono ?? null,
        max_acompanantes: invitado.max_acompanantes,
        pin_hash: pinHash,
        creado_por: auth.user.id,
      })
      .select("id, nombre, email, magic_token")
      .single();

    if (error || !data) {
      fallidos.push({ nombre: invitado.nombre, email: invitado.email, error: error?.message ?? "Error desconocido" });
      continue;
    }

    const link = `${baseUrl}/confirmar/${data.magic_token}`;
    creados.push({ id: data.id, nombre: data.nombre, email: data.email, token: data.magic_token, pin, link });

    if (enviar_email) {
      try {
        await enviarInvitacion({ to: data.email, nombre: data.nombre, link, pin, nombreBoda: nombre_boda });
      } catch {
        // El invitado ya fue creado; el envío se puede reintentar desde "reenviar".
      }
    }
  }

  return NextResponse.json({ creados, fallidos }, { status: 201 });
}
