import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isDemoMode } from "@/lib/demo";
import LogoutButton from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const demo = isDemoMode();

  return (
    <div className="min-h-screen bg-gray-50">
      {demo && (
        <div className="bg-black px-6 py-2 text-center text-sm text-white">
          🎭 Modo demo — datos falsos en memoria, sin conexión a Supabase. El PIN de todos los
          invitados es <strong>1234</strong>.
        </div>
      )}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            💍 Boda
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">
            Inicio
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
