import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Iniciar sesión · STUDY AI" };
type AuthSearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SignInPage({ searchParams }: AuthSearchProps) {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card auth-loading" aria-label="Cargando inicio de sesión"/></main>}><SignInContent searchParams={searchParams}/></Suspense>;
}

async function SignInContent({ searchParams }: AuthSearchProps) {
  const params = await searchParams;
  return <main className="auth-page"><AuthForm mode="sign-in" nextPath={safeRedirectPath(params.next, "/app")} isSupabaseConfigured={Boolean(getSupabaseConfig())}/></main>;
}
