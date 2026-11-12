import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase todavía no está configurado.");
  return createBrowserClient(config.url, config.key);
}
