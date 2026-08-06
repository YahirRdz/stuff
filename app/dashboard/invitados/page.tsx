"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Invitado {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estado: "pending" | "confirmed" | "declined" | "attended" | "no_show";
  max_acompanantes: number;
  num_acompanantes: number;
  confirmado_at: string | null;
}

const ESTADO_LABEL: Record<Invitado["estado"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  declined: "Declinado",
  attended: "Asistió",
  no_show: "No asistió",
};

const ESTADO_COLOR: Record<Invitado["estado"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  attended: "bg-blue-100 text-blue-700",
  no_show: "bg-gray-100 text-gray-700",
};

export default function InvitadosPage() {
  const searchParams = useSearchParams();
  const bodaId = searchParams.get("boda_id") ?? "";

  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!bodaId) return;
    setLoading(true);
    const query = new URLSearchParams({ boda_id: bodaId });
    if (filtroEstado) query.set("estado", filtroEstado);
    if (buscar) query.set("buscar", buscar);

    const res = await fetch(`/api/boda/invitados?${query.toString()}`);
    const data = await res.json();
    setInvitados(data.invitados ?? []);
    setLoading(false);
  }, [bodaId, filtroEstado, buscar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    cargar();
  }, [cargar]);

  async function reenviarLink(id: string) {
    setReenviando(id);
    setMensaje(null);
    const res = await fetch(`/api/boda/invitados/${id}/reenviar`, { method: "POST" });
    const data = await res.json();
    setReenviando(null);
    setMensaje(res.ok ? `Invitación reenviada a ${data.email}` : data.mensaje ?? "Error al reenviar");
  }

  function exportarCsv() {
    const header = ["Nombre", "Email", "Teléfono", "Estado", "Acompañantes", "Confirmado el"];
    const filas = invitados.map((i) => [
      i.nombre,
      i.email,
      i.telefono ?? "",
      ESTADO_LABEL[i.estado],
      String(i.num_acompanantes),
      i.confirmado_at ?? "",
    ]);
    const csv = [header, ...filas].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invitados</h1>
        <div className="flex gap-3">
          <button onClick={exportarCsv} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Exportar CSV
          </button>
          <Link
            href={`/dashboard/invitados/crear?boda_id=${bodaId}`}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            + Agregar invitados
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {mensaje && <p className="mb-4 text-sm text-gray-600">{mensaje}</p>}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acompañantes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invitados.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/invitados/${inv.id}`} className="font-medium hover:underline">
                      {inv.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {inv.email}
                    {inv.telefono ? ` · ${inv.telefono}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_COLOR[inv.estado]}`}>
                      {ESTADO_LABEL[inv.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.num_acompanantes} / {inv.max_acompanantes}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => reenviarLink(inv.id)}
                      disabled={reenviando === inv.id}
                      className="text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {reenviando === inv.id ? "Enviando..." : "Reenviar"}
                    </button>
                  </td>
                </tr>
              ))}
              {invitados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No hay invitados que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
