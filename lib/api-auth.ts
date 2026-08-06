import { createServerSupabaseClient } from "@/lib/supabase-server";

/** Returns the logged-in user's Supabase client + user, or null if unauthenticated. */
export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { supabase, user };
}
