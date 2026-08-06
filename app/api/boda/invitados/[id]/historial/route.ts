import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await auth.supabase
    .from("invitados_historial")
    .select("id, evento, cambios, ip_address, user_agent, creado_at")
    .eq("invitado_id", id)
    .order("creado_at", { ascending: false });

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  return NextResponse.json({ historial: data });
}
