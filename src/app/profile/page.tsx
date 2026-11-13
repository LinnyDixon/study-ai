import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getPlanName, type PlanTier } from "@/lib/plans";
import { ProfileForm, ProfilePageHeader } from "./profile-form";

export const metadata: Metadata = { title: "Tu perfil · STUDY AI" };
type ProfileSearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ProfilePage({ searchParams }: ProfileSearchProps) {
  return <Suspense fallback={<main className="profile-page"><div className="panel profile-settings-card" aria-label="Cargando perfil"/></main>}><ProfileContent searchParams={searchParams}/></Suspense>;
}

async function ProfileContent({ searchParams }: ProfileSearchProps) {
  await connection();
  if (!getSupabaseConfig()) redirect("/auth/configuration");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=%2Fprofile");

  const [{ data: profile }, { data: preferenceRow }, { data: plan, error: planError }, params] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("preferences").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_plans").select("plan,payment_status,period_ends_at").eq("user_id", user.id).maybeSingle(),
    searchParams,
  ]);
  const displayName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "";
  const preferences = preferenceRow?.preferences && typeof preferenceRow.preferences === "object" && !Array.isArray(preferenceRow.preferences)
    ? preferenceRow.preferences as Record<string, unknown>
    : {};
  const avatarUrl = profile?.avatar_url
    ? (await supabase.storage.from("profile-avatars").createSignedUrl(profile.avatar_url, 3600)).data?.signedUrl || null
    : null;
  const planName = !planError && plan
    ? getPlanName(plan.plan as PlanTier, plan.payment_status, plan.period_ends_at)
    : null;

  return <main className="profile-page">
    <ProfilePageHeader/>
    <ProfileForm
      displayName={displayName}
      email={user.email || ""}
      emailVerified={Boolean(user.email_confirmed_at)}
      createdAt={profile?.created_at || user.created_at || null}
      avatarUrl={avatarUrl}
      avatarPath={profile?.avatar_url || null}
      preferences={preferences}
      planName={planName}
      planPaymentStatus={plan?.payment_status || null}
      planEndsAt={plan?.period_ends_at || null}
      saved={params.saved === "1"}
      error={typeof params.error === "string" ? params.error : undefined}
    />
  </main>;
}
