import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import LogoutButton from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
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
