import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-3 text-3xl font-semibold">💍 Trakeo de invitados</h1>
      <p className="mb-8 text-gray-600">
        Crea invitaciones, envíalas por WhatsApp o email, y lleva el control de quién confirma su
        asistencia a tu boda.
      </p>
      <div className="flex gap-3">
        <Link href="/auth/login" className="rounded-md bg-black px-5 py-2.5 text-white">
          Iniciar sesión
        </Link>
        <Link href="/auth/signup" className="rounded-md border border-gray-300 px-5 py-2.5">
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
