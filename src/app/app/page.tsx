import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { getPlanName, type PlanTier } from "@/lib/plans";
import Home from "./home-client";

export default function AppPage() {
  return <Suspense fallback={<div className="shell"><main className="main-area"><div className="content">Cargando tu espacio de estudio…</div></main></div>}><AppContent/></Suspense>;
}

async function AppContent() {
  await connection();
  if (!getSupabaseConfig()) redirect("/auth/configuration");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=%2Fapp");

  const [{ data: plan }, { data: profile }, { data: preferenceRow }] = await Promise.all([
    supabase.from("user_plans").select("plan,payment_status,period_ends_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("preferences").eq("user_id", user.id).maybeSingle(),
  ]);

  const planName = plan
    ? getPlanName(plan.plan as PlanTier, plan.payment_status, plan.period_ends_at)
    : "Gratis";

  const avatarUrl = profile?.avatar_url ? (await supabase.storage.from("profile-avatars").createSignedUrl(profile.avatar_url, 3600)).data?.signedUrl || null : null;
  const preferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences) ? preferenceRow.preferences as Record<string, unknown> : {};
  const theme = preferences.theme === "dark" || preferences.theme === "system" ? preferences.theme : "light";
  const language = ["es", "en", "pt-BR", "fr", "de", "zh-CN", "ja"].includes(String(preferences.language)) ? String(preferences.language) as import("@/lib/app-languages").AppLanguage : "es";
  return <Home planName={planName} preferences={{ theme, language, notifications: preferences.notifications === true, sounds: preferences.sounds === true }} profile={{ displayName: profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "", email: user.email || "", avatarUrl }}/>;
}
