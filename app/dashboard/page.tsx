import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CrearBodaForm from "./CrearBodaForm";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: bodas } = await supabase
    .from("bodas")
    .select("id, nombre, fecha")
    .order("creado_at", { ascending: false });

  if (!bodas || bodas.length === 0) {
    return <CrearBodaForm />;
  }

  const boda = bodas[0];

  const { data: invitados } = await supabase
    .from("invitados")
    .select("estado, num_acompanantes")
    .eq("boda_id", boda.id);

  const total = invitados?.length ?? 0;
  const confirmados = invitados?.filter((i) => i.estado === "confirmed").length ?? 0;
  const pendientes = invitados?.filter((i) => i.estado === "pending").length ?? 0;
  const declinados = invitados?.filter((i) => i.estado === "declined").length ?? 0;
  const totalAsistentes =
    invitados
      ?.filter((i) => i.estado === "confirmed")
      .reduce((sum, i) => sum + 1 + (i.num_acompanantes ?? 0), 0) ?? 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{boda.nombre}</h1>
          <p className="text-gray-500">{new Date(boda.fecha).toLocaleDateString("es-ES", { dateStyle: "long" })}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/invitados/crear?boda_id=${boda.id}`}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            + Agregar invitados
          </Link>
          <Link
            href={`/dashboard/invitados?boda_id=${boda.id}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Ver invitados
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total invitados" value={total} />
        <StatCard label="Confirmados" value={confirmados} accent="text-green-600" />
        <StatCard label="Pendientes" value={pendientes} accent="text-yellow-600" />
        <StatCard label="Declinados" value={declinados} accent="text-red-600" />
        <StatCard label="Asistentes totales" value={totalAsistentes} accent="text-blue-600" />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
