import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isDemoMode } from "./demo";
import { createDemoSupabaseClient } from "./demo-db";

/**
 * Server-side Supabase client bound to the current user's session cookies.
 * Respects RLS as the logged-in novio/colaborador. In DEMO_MODE, returns the
 * in-memory demo client instead, always "logged in" as the fixed demo user.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  if (isDemoMode()) {
    return createDemoSupabaseClient() as unknown as SupabaseClient;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a mutable cookie store; safe to ignore
            // because middleware handles session refresh.
          }
        },
      },
    }
  );
}
