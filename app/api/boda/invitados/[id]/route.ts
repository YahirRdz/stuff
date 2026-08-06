import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { registrarEvento } from "@/lib/historial";

const editarInvitadoSchema = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  max_acompanantes: z.number().int().min(1).max(20).optional(),
  mesa_asignada: z.number().int().nullable().optional(),
  asiento_asignado: z.number().int().nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from("invitados")
    .select(
      "id, nombre, email, telefono, estado, max_acompanantes, num_acompanantes, restricciones_dieteticas, comentarios, mesa_asignada, asiento_asignado"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ mensaje: "Invitado no encontrado" }, { status: 404 });

  return NextResponse.json({ invitado: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = editarInvitadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ mensaje: "Solicitud inválida" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("invitados")
    .update(parsed.data)
    .eq("id", id)
    .select("id, nombre, email, telefono, max_acompanantes, mesa_asignada, asiento_asignado")
    .single();

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });

  await registrarEvento({
    supabase: auth.supabase,
    invitadoId: id,
    evento: "editado",
    cambios: parsed.data,
  });

  return NextResponse.json({ invitado: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { error } = await auth.supabase.from("invitados").delete().eq("id", id);

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  return NextResponse.json({ eliminado: true });
}
