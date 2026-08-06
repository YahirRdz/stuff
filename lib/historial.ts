import type { SupabaseClient } from "@supabase/supabase-js";

interface RegistrarEventoParams {
  supabase: SupabaseClient;
  invitadoId: string;
  evento: string;
  cambios?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Inserta un registro inmutable en invitados_historial. Nunca actualiza ni borra filas existentes. */
export async function registrarEvento({
  supabase,
  invitadoId,
  evento,
  cambios,
  ipAddress,
  userAgent,
}: RegistrarEventoParams) {
  await supabase.from("invitados_historial").insert({
    invitado_id: invitadoId,
    evento,
    cambios: cambios ?? null,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  });
}

export function obtenerIpDeRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
