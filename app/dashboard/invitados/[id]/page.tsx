"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface InvitadoDetalle {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  max_acompanantes: number;
  mesa_asignada: number | null;
  asiento_asignado: number | null;
}

interface EventoHistorial {
  id: string;
  evento: string;
  cambios: Record<string, unknown> | null;
  ip_address: string | null;
  creado_at: string;
}

export default function DetalleInvitadoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [invitado, setInvitado] = useState<InvitadoDetalle | null>(null);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [invRes, histRes] = await Promise.all([
      fetch(`/api/boda/invitados/${id}`),
      fetch(`/api/boda/invitados/${id}/historial`),
    ]);
    const invData = await invRes.json();
    const histData = await histRes.json();
    setInvitado(invData.invitado ?? null);
    setHistorial(histData.historial ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    cargar();
  }, [cargar]);

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invitado) return;
    setGuardando(true);
    setMensaje(null);

    const res = await fetch(`/api/boda/invitados/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: invitado.nombre,
        email: invitado.email,
        telefono: invitado.telefono,
        max_acompanantes: invitado.max_acompanantes,
        mesa_asignada: invitado.mesa_asignada,
        asiento_asignado: invitado.asiento_asignado,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    setMensaje(res.ok ? "Cambios guardados" : data.mensaje ?? "Error al guardar");
    if (res.ok) cargar();
  }

  if (loading || !invitado) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Editar invitado</h1>
        <form onSubmit={handleGuardar} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input
              value={invitado.nombre}
              onChange={(e) => setInvitado({ ...invitado, nombre: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              value={invitado.email}
              onChange={(e) => setInvitado({ ...invitado, email: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Teléfono
            <input
              value={invitado.telefono ?? ""}
              onChange={(e) => setInvitado({ ...invitado, telefono: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Máximo de acompañantes
            <input
              type="number"
              min={0}
              value={invitado.max_acompanantes}
              onChange={(e) => setInvitado({ ...invitado, max_acompanantes: Number(e.target.value) })}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Mesa
              <input
                type="number"
                value={invitado.mesa_asignada ?? ""}
                onChange={(e) =>
                  setInvitado({ ...invitado, mesa_asignada: e.target.value ? Number(e.target.value) : null })
                }
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Asiento
              <input
                type="number"
                value={invitado.asiento_asignado ?? ""}
                onChange={(e) =>
                  setInvitado({ ...invitado, asiento_asignado: e.target.value ? Number(e.target.value) : null })
                }
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          </div>
          {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">Historial</h2>
        <ul className="flex flex-col gap-3">
          {historial.map((h) => (
            <li key={h.id} className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{h.evento}</span>
                <span className="text-gray-400">{new Date(h.creado_at).toLocaleString("es-ES")}</span>
              </div>
              {h.cambios && (
                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                  {JSON.stringify(h.cambios, null, 2)}
                </pre>
              )}
              {h.ip_address && <p className="mt-1 text-xs text-gray-400">IP: {h.ip_address}</p>}
            </li>
          ))}
          {historial.length === 0 && <p className="text-gray-400">Sin eventos registrados</p>}
        </ul>
      </div>
    </div>
  );
}
