"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const email = new FormData(event.currentTarget).get("email");
      if (typeof email !== "string" || !email.trim()) throw new Error("Escribe tu correo electrónico.");
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
      });
      if (error) throw error;
      setMessage("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el correo.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link>
    <div className="auth-eyebrow">RECUPERAR ACCESO</div><h1>Restablece tu contraseña</h1>
    <p className="auth-subtitle">Te enviaremos un enlace seguro al correo asociado a tu cuenta.</p>
    <form className="auth-fields" onSubmit={submit}><label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com"/></label><button className="auth-submit" disabled={busy}>{busy ? "Enviando…" : "Enviar enlace"}</button></form>
    {message && <p className="auth-message" role="status">{message}</p>}
    <p className="auth-switch"><Link href="/auth/sign-in">Volver a iniciar sesión</Link></p>
  </section></main>;
}
