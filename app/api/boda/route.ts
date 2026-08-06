import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";

const crearBodaSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  fecha: z.string().date(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("bodas")
    .select("id, nombre, fecha, creado_por")
    .order("creado_at", { ascending: false });

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  return NextResponse.json({ bodas: data });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = crearBodaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ mensaje: "Solicitud inválida" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("bodas")
    .insert({ nombre: parsed.data.nombre, fecha: parsed.data.fecha, creado_por: auth.user.id })
    .select("id, nombre, fecha")
    .single();

  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  return NextResponse.json({ boda: data }, { status: 201 });
}
