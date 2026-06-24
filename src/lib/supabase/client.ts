import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
   if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
   }

   if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseKey);
   }

   return browserClient;
}
