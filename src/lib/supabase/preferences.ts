"use client";

import { createClient } from "./client";

/** Update preference keys atomically when the account migration is available.
 * Keep older installations usable with an RLS-protected read/merge/update fallback.
 */
export async function saveMyPreferences(patch: Record<string, unknown>) {
  const supabase = createClient();
  const { error: rpcError } = await supabase.rpc("merge_my_preferences", { p_patch: patch });
  if (!rpcError) {
    if ("theme" in patch) localStorage.removeItem("study-ai-theme");
    return { error: null };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: authError || rpcError };
  const { data: row, error: readError } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { error: readError };

  const current = row?.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
    ? row.preferences as Record<string, unknown>
    : {};
  const { error } = row
    ? await supabase.from("user_preferences").update({ preferences: { ...current, ...patch } }).eq("user_id", user.id)
    : await supabase.from("user_preferences").insert({ user_id: user.id, preferences: patch });
  if (!error && "theme" in patch) localStorage.removeItem("study-ai-theme");
  return { error };
}
