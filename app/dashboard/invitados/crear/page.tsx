"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FilaInvitado {
  nombre: string;
  email: string;
  telefono: string;
  max_acompanantes: number;
}

function filaVacia(): FilaInvitado {
  return { nombre: "", email: "", telefono: "", max_acompanantes: 1 };
}

interface ResultadoCreacion {
  creados: { nombre: string; email: string; link: string; pin: string }[];
  fallidos: { nombre: string; email: string; error: string }[];
}

export default function CrearInvitadosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bodaId = searchParams.get("boda_id") ?? "";

  const [nombreBoda, setNombreBoda] = useState("");
  const [filas, setFilas] = useState<FilaInvitado[]>([filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCreacion | null>(null);

  function actualizarFila(index: number, campo: keyof FilaInvitado, valor: string | number) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function eliminarFila(index: number) {
    setFilas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/boda/invitados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boda_id: bodaId,
        nombre_boda: nombreBoda,
        invitados: filas.map((f) => ({
          nombre: f.nombre,
          email: f.email,
          telefono: f.telefono || null,
          max_acompanantes: Number(f.max_acompanantes),
        })),
      }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.mensaje ?? "No se pudieron crear las invitaciones");
      return;
    }

    setResultado(data);
  }

  if (resultado) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Invitaciones creadas</h1>
        {resultado.creados.length > 0 && (
          <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Link</th>
                  <th className="px-4 py-2">PIN</th>
                </tr>
              </thead>
              <tbody>
                {resultado.creados.map((c) => (
                  <tr key={c.email} className="border-t border-gray-100">
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2">{c.email}</td>
                    <td className="max-w-xs truncate px-4 py-2">
                      <a href={c.link} className="text-blue-600 underline">
                        {c.link}
                      </a>
                    </td>
                    <td className="px-4 py-2 font-mono">{c.pin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultado.fallidos.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-2 font-medium">No se pudieron crear:</p>
            <ul className="list-disc pl-5">
              {resultado.fallidos.map((f) => (
                <li key={f.email}>
                  {f.nombre} ({f.email}): {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href={`/dashboard/invitados?boda_id=${bodaId}`} className="text-sm underline">
          Ir a la lista de invitados
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Agregar invitados</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <input
          type="text"
          required
          placeholder="Nombre de la boda (aparece en el email)"
          value={nombreBoda}
          onChange={(e) => setNombreBoda(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2"
        />

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2">Máx. acompañantes</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      required
                      value={fila.nombre}
                      onChange={(e) => actualizarFila(i, "nombre", e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="email"
                      required
                      value={fila.email}
                      onChange={(e) => actualizarFila(i, "email", e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={fila.telefono}
                      onChange={(e) => actualizarFila(i, "telefono", e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={fila.max_acompanantes}
                      onChange={(e) => actualizarFila(i, "max_acompanantes", e.target.value)}
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {filas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarFila(i)}
                        className="text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={agregarFila} className="self-start text-sm underline">
          + Agregar otra fila
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !bodaId}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear y enviar invitaciones"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/invitados?boda_id=${bodaId}`)}
            className="rounded-md border border-gray-300 px-4 py-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
