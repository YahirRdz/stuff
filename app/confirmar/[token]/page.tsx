"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isDemoMode } from "@/lib/demo";

type Paso = "cargando" | "pin" | "responder" | "gracias" | "error";

interface EstadoInvitado {
  nombre: string;
  maxAcompanantes: number;
}

export default function ConfirmarPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [paso, setPaso] = useState<Paso>("cargando");
  const [mensajeError, setMensajeError] = useState("");
  const [invitado, setInvitado] = useState<EstadoInvitado | null>(null);

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [sesionToken, setSesionToken] = useState("");

  const [respuesta, setRespuesta] = useState<"confirmed" | "declined" | null>(null);
  const [numAcompanantes, setNumAcompanantes] = useState(0);
  const [dietary, setDietary] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeFinal, setMensajeFinal] = useState("");

  useEffect(() => {
    async function validar() {
      try {
        const res = await fetch("/api/invitados/validar-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok || !data.existe || !data.token_valido) {
          setMensajeError(data.mensaje ?? "Esta invitación no es válida");
          setPaso("error");
          return;
        }

        setInvitado({ nombre: data.nombre, maxAcompanantes: data.max_acompanantes });
        setPaso("pin");
      } catch {
        setMensajeError("No se pudo conectar. Intenta de nuevo.");
        setPaso("error");
      }
    }

    if (token) validar();
  }, [token]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinLoading(true);
    setPinError("");

    try {
      const res = await fetch("/api/invitados/verificar-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.valido) {
        setPinError(data.mensaje ?? "Código incorrecto");
        setPinLoading(false);
        return;
      }

      setSesionToken(data.sesion_token);
      setPaso("responder");
    } catch {
      setPinError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleConfirmarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!respuesta) return;

    setEnviando(true);

    try {
      const res = await fetch("/api/invitados/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesionToken}` },
        body: JSON.stringify({
          respuesta,
          num_acompanantes: numAcompanantes,
          restricciones_dieteticas: dietary || null,
          comentarios: comentarios || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.confirmado) {
        setMensajeError(data.mensaje ?? "No se pudo registrar tu respuesta");
        setPaso("error");
        return;
      }

      setMensajeFinal(data.mensaje);
      setPaso("gracias");
    } catch {
      setMensajeError("No se pudo conectar. Intenta de nuevo.");
      setPaso("error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {paso === "cargando" && <p className="text-center text-gray-500">Cargando invitación...</p>}

      {paso === "error" && (
        <div className="text-center">
          <h1 className="mb-2 text-xl font-semibold">Ups</h1>
          <p className="text-gray-600">{mensajeError}</p>
        </div>
      )}

      {paso === "pin" && invitado && (
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Hola, {invitado.nombre} 👋</h1>
          <p className="mb-6 text-gray-600">Ingresa el código de 4 dígitos que recibiste para continuar.</p>
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              placeholder="0000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="rounded-md border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em]"
            />
            {pinError && <p className="text-sm text-red-600">{pinError}</p>}
            <button
              type="submit"
              disabled={pinLoading || pin.length !== 4}
              className="rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
            >
              {pinLoading ? "Verificando..." : "Continuar"}
            </button>
          </form>
          {isDemoMode() && (
            <p className="mt-4 text-center text-sm text-gray-400">🎭 Modo demo — usa el PIN 1234</p>
          )}
        </div>
      )}

      {paso === "responder" && invitado && (
        <form onSubmit={handleConfirmarSubmit} className="flex flex-col gap-5">
          <h1 className="text-2xl font-semibold">¿Nos acompañas, {invitado.nombre}?</h1>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRespuesta("confirmed")}
              className={`flex-1 rounded-md border px-4 py-3 ${
                respuesta === "confirmed" ? "border-black bg-black text-white" : "border-gray-300"
              }`}
            >
              Sí, ahí estaré
            </button>
            <button
              type="button"
              onClick={() => setRespuesta("declined")}
              className={`flex-1 rounded-md border px-4 py-3 ${
                respuesta === "declined" ? "border-black bg-black text-white" : "border-gray-300"
              }`}
            >
              No podré asistir
            </button>
          </div>

          {respuesta === "confirmed" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">
                  Acompañantes adicionales (máximo {invitado.maxAcompanantes})
                </span>
                <input
                  type="number"
                  min={0}
                  max={invitado.maxAcompanantes}
                  value={numAcompanantes}
                  onChange={(e) => setNumAcompanantes(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-4 py-2"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Restricciones dietéticas (opcional)</span>
                <input
                  type="text"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Vegetariano, alergias, etc."
                  className="rounded-md border border-gray-300 px-4 py-2"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Comentarios (opcional)</span>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={3}
              className="rounded-md border border-gray-300 px-4 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={!respuesta || enviando}
            className="rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar respuesta"}
          </button>
        </form>
      )}

      {paso === "gracias" && (
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">¡Listo! 🎉</h1>
          <p className="text-gray-600">{mensajeFinal}</p>
        </div>
      )}
    </main>
  );
}
