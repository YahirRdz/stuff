import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { confirmarSchema } from "@/lib/schemas";
import { verificarSesionToken } from "@/lib/crypto";
import { registrarEvento, obtenerIpDeRequest } from "@/lib/historial";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const sesionToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!sesionToken) {
    return NextResponse.json({ confirmado: false, mensaje: "No autorizado" }, { status: 401 });
  }

  const payload = verificarSesionToken(sesionToken);
  if (!payload) {
    return NextResponse.json(
      { confirmado: false, mensaje: "Tu sesión expiró, vuelve a ingresar tu PIN" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmarSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ confirmado: false, mensaje: "Solicitud inválida" }, { status: 400 });
  }

  const { respuesta, restricciones_dieteticas, num_acompanantes, comentarios } = parsed.data;
  const supabase = createAdminClient();
  const ipAddress = obtenerIpDeRequest(request);
  const userAgent = request.headers.get("user-agent");

  const { data: invitado } = await supabase
    .from("invitados")
    .select("id, max_acompanantes")
    .eq("id", payload.invitadoId)
    .maybeSingle();

  if (!invitado) {
    return NextResponse.json({ confirmado: false, mensaje: "Invitación no encontrada" }, { status: 404 });
  }

  const acompanantesEfectivos = respuesta === "declined" ? 0 : num_acompanantes;

  if (acompanantesEfectivos > invitado.max_acompanantes) {
    return NextResponse.json(
      {
        confirmado: false,
        mensaje: `Máximo ${invitado.max_acompanantes} persona(s) permitidas para esta invitación`,
      },
      { status: 422 }
    );
  }

  // Registro inmutable del evento de confirmación (event sourcing)
  await supabase.from("confirmaciones").insert({
    invitado_id: invitado.id,
    respuesta,
    restricciones_dieteticas: restricciones_dieteticas ?? null,
    num_acompanantes: acompanantesEfectivos,
    comentarios: comentarios ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  // Vista actual desnormalizada para lectura rápida en el dashboard
  await supabase
    .from("invitados")
    .update({
      estado: respuesta,
      confirmado_at: new Date().toISOString(),
      restricciones_dieteticas: restricciones_dieteticas ?? null,
      num_acompanantes: acompanantesEfectivos,
      comentarios: comentarios ?? null,
    })
    .eq("id", invitado.id);

  await registrarEvento({
    supabase,
    invitadoId: invitado.id,
    evento: respuesta,
    cambios: { respuesta, num_acompanantes: acompanantesEfectivos, restricciones_dieteticas, comentarios },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    confirmado: true,
    id: invitado.id,
    max_acompanantes: invitado.max_acompanantes,
    num_confirmados: acompanantesEfectivos,
    mensaje: respuesta === "confirmed" ? "¡Gracias por confirmar!" : "Respuesta registrada",
  });
}
