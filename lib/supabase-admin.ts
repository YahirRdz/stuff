import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "./demo";
import { createDemoSupabaseClient } from "./demo-db";

/**
 * Service-role client for server-only use (API routes). Bypasses RLS.
 * Never import this in client components.
 */
export function createAdminClient(): SupabaseClient {
  if (isDemoMode()) {
    return createDemoSupabaseClient() as unknown as SupabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin env vars");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
