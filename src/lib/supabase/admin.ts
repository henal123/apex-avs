import { createClient } from "@supabase/supabase-js";

// Admin client with service role key - server-only
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client must not be used in browser");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
