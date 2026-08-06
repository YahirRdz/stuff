import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verificarPinSchema } from "@/lib/schemas";
import { verificarPin, crearSesionToken } from "@/lib/crypto";
import { registrarEvento, obtenerIpDeRequest } from "@/lib/historial";
import { PIN_MAX_INTENTOS, PIN_BLOQUEO_MINUTOS, SESION_JWT_MINUTOS } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verificarPinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ valido: false, mensaje: "Solicitud inválida" }, { status: 400 });
  }

  const { token, pin } = parsed.data;
  const supabase = createAdminClient();
  const ipAddress = obtenerIpDeRequest(request);
  const userAgent = request.headers.get("user-agent");

  const { data: invitado } = await supabase
    .from("invitados")
    .select("id, pin_hash, pin_intentos, pin_bloqueado_hasta, token_expira_at")
    .eq("magic_token", token)
    .maybeSingle();

  if (!invitado) {
    return NextResponse.json({ valido: false, mensaje: "Invitación no encontrada" }, { status: 404 });
  }

  if (new Date(invitado.token_expira_at) < new Date()) {
    return NextResponse.json({ valido: false, mensaje: "Esta invitación ha expirado" }, { status: 410 });
  }

  if (invitado.pin_bloqueado_hasta && new Date(invitado.pin_bloqueado_hasta) > new Date()) {
    return NextResponse.json(
      {
        valido: false,
        mensaje: `Demasiados intentos. Intenta de nuevo después de ${new Date(
          invitado.pin_bloqueado_hasta
        ).toLocaleTimeString()}.`,
      },
      { status: 429 }
    );
  }

  const pinCorrecto = await verificarPin(pin, invitado.pin_hash);

  if (!pinCorrecto) {
    const nuevosIntentos = invitado.pin_intentos + 1;
    const bloqueado = nuevosIntentos >= PIN_MAX_INTENTOS;

    await supabase
      .from("invitados")
      .update({
        pin_intentos: bloqueado ? 0 : nuevosIntentos,
        pin_bloqueado_hasta: bloqueado
          ? new Date(Date.now() + PIN_BLOQUEO_MINUTOS * 60_000).toISOString()
          : invitado.pin_bloqueado_hasta,
      })
      .eq("id", invitado.id);

    await registrarEvento({
      supabase,
      invitadoId: invitado.id,
      evento: bloqueado ? "pin_bloqueado" : "pin_intento_fallido",
      cambios: { intentos: nuevosIntentos },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        valido: false,
        mensaje: bloqueado
          ? `Demasiados intentos. Bloqueado por ${PIN_BLOQUEO_MINUTOS} minutos.`
          : "Código incorrecto",
      },
      { status: 401 }
    );
  }

  // PIN correcto: resetear intentos y emitir sesión
  await supabase
    .from("invitados")
    .update({ pin_intentos: 0, pin_bloqueado_hasta: null })
    .eq("id", invitado.id);

  await registrarEvento({
    supabase,
    invitadoId: invitado.id,
    evento: "pin_verificado",
    ipAddress,
    userAgent,
  });

  const sesionToken = crearSesionToken(invitado.id);
  const validoHasta = new Date(Date.now() + SESION_JWT_MINUTOS * 60_000).toISOString();

  return NextResponse.json({
    valido: true,
    sesion_token: sesionToken,
    valido_hasta: validoHasta,
    mensaje: "Código verificado",
  });
}
