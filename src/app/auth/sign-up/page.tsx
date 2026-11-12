import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Crear cuenta · STUDY AI" };
type AuthSearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SignUpPage({ searchParams }: AuthSearchProps) {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card auth-loading" aria-label="Cargando registro"/></main>}><SignUpContent searchParams={searchParams}/></Suspense>;
}

async function SignUpContent({ searchParams }: AuthSearchProps) {
  const params = await searchParams;
  return <main className="auth-page"><AuthForm mode="sign-up" nextPath={safeRedirectPath(params.next, "/app")} isSupabaseConfigured={Boolean(getSupabaseConfig())}/></main>;
}
