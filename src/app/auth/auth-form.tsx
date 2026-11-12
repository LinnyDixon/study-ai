"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { mode: "sign-in" | "sign-up"; nextPath?: string; isSupabaseConfigured: boolean };

export function AuthForm({ mode, nextPath = "/app", isSupabaseConfigured }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isSignUp = mode === "sign-up";

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      if (isSignUp) {
        const name = String(formData.get("name") || "").trim();
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
        });
        if (error) throw error;
        if (!data.session) setMessage("Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.");
        else window.location.assign(nextPath);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(nextPath);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar el acceso. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
      });
      if (error) throw error;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      setMessage(errorMessage.toLowerCase().includes("provider is not enabled")
        ? "Google todavía no está habilitado en Supabase. Por ahora, inicia sesión con tu correo y contraseña."
        : errorMessage || "No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  }

  return <div className="auth-card">
    <Link className="auth-brand" href="/" aria-label="STUDY AI, inicio"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link>
    <div className="auth-eyebrow">TU ESPACIO PARA APRENDER</div>
    <h1>{isSignUp ? "Crea tu cuenta" : "Qué bueno verte"}</h1>
    <p className="auth-subtitle">{isSignUp ? "Guarda tu progreso y accede a tus materiales en tus dispositivos." : "Inicia sesión para entrar a tu espacio de estudio."}</p>
    <button type="button" className="google-button" onClick={signInWithGoogle} disabled={busy || !isSupabaseConfigured}><span className="google-g">G</span> Continuar con Google</button>
    <div className="auth-divider"><span>o con tu correo</span></div>
    <form action={submit} className="auth-fields">
      {isSignUp && <label>Nombre para mostrar<input name="name" autoComplete="name" maxLength={80} required placeholder="Tu nombre"/></label>}
      <label>Correo electrónico<input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com"/></label>
      <label>Contraseña<input name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required placeholder="Al menos 8 caracteres"/></label>
      {!isSignUp && <Link className="forgot-link" href="/auth/forgot-password">¿Olvidaste tu contraseña?</Link>}
      <button className="auth-submit" disabled={busy || !isSupabaseConfigured}>{busy ? "Un momento…" : isSignUp ? "Crear cuenta" : "Iniciar sesión"}</button>
    </form>
    {!isSupabaseConfigured && <p className="auth-message" role="status">El acceso con cuentas todavía no está conectado. <Link href="/auth/configuration">Ver cómo prepararlo</Link>.</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <p className="auth-switch">{isSignUp ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"} <Link href={isSignUp ? `/auth/sign-in?next=${encodeURIComponent(nextPath)}` : `/auth/sign-up?next=${encodeURIComponent(nextPath)}`}>{isSignUp ? "Inicia sesión" : "Crea una cuenta"}</Link></p>
    <p className="auth-privacy">Tu cuenta y tus datos son personales.</p>
  </div>;
}
