"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { isDemoMode } from "@/lib/demo";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    if (isDemoMode()) {
      // No real session to end in demo mode; the dashboard is always accessible.
      router.push("/");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="text-sm text-gray-600 underline hover:text-black">
      Cerrar sesión
    </button>
  );
}
