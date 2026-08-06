"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CrearBodaForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/boda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, fecha }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.mensaje ?? "No se pudo crear la boda");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-8">
      <h1 className="mb-1 text-xl font-semibold">Crea tu boda</h1>
      <p className="mb-6 text-sm text-gray-600">Empieza dándole nombre y fecha a tu evento.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          required
          placeholder="Boda de Ana y Luis"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2"
        />
        <input
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear boda"}
        </button>
      </form>
    </div>
  );
}
