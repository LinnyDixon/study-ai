import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

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

  const [{ data: profile }, { data: isAdmin }, params] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.rpc("is_study_admin"),
    searchParams,
  ]);
  const displayName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "";

  return <main className="profile-page">
    <div className="eyebrow"><span className="sparkle">✳</span> TU ESPACIO PERSONAL</div>
    <h1>Perfil y cuenta</h1>
    <p className="tool-intro">Administra los datos básicos de tu cuenta.</p>
    <ProfileForm displayName={displayName} email={user.email || ""} isAdmin={isAdmin === true} saved={params.saved === "1"} error={typeof params.error === "string" ? params.error : undefined}/>
  </main>;
}
