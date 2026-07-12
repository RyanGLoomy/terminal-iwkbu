import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a process-level singleton Supabase admin client (service-role).
 * Avoids re-creating the client (with its config/fetch setup) on every call.
 * The service-role key is stable for the process lifetime.
 */
export function createAdminClient(): SupabaseClient {
   if (_client) return _client;

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

   if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase admin environment variables");
   }

   _client = createClient(supabaseUrl, serviceKey, {
      auth: {
         persistSession: false,
         autoRefreshToken: false,
      },
   });

   return _client;
}
