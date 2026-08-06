import { Resend } from "resend";
import { isDemoMode } from "./demo";

interface EnviarInvitacionParams {
  to: string;
  nombre: string;
  link: string;
  pin: string;
  nombreBoda: string;
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var");
  return new Resend(apiKey);
}

export async function enviarInvitacion({
  to,
  nombre,
  link,
  pin,
  nombreBoda,
}: EnviarInvitacionParams) {
  if (isDemoMode()) {
    console.log(`[demo] Invitación para ${nombre} <${to}>: ${link} (PIN ${pin})`);
    return { data: null, error: null };
  }

  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? "invitaciones@resend.dev";

  return resend.emails.send({
    from,
    to,
    subject: `Estás invitado a ${nombreBoda}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1>¡Hola ${nombre}!</h1>
        <p>Nos encantaría contar con tu presencia en <strong>${nombreBoda}</strong>.</p>
        <p>Confirma tu asistencia aquí:</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Confirmar asistencia</a></p>
        <p>Tu código de acceso es: <strong style="font-size:20px;letter-spacing:4px;">${pin}</strong></p>
        <p style="color:#666;font-size:14px;">Guarda este código, lo necesitarás para confirmar tu asistencia.</p>
      </div>
    `,
  });
}
