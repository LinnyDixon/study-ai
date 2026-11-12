"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const password = String(new FormData(event.currentTarget).get("password") || "");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/app");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo cambiar la contraseña."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link>
    <div className="auth-eyebrow">RECUPERAR ACCESO</div><h1>Elige una contraseña nueva</h1>
    <p className="auth-subtitle">Usa al menos 8 caracteres.</p>
    <form className="auth-fields" onSubmit={submit}><label>Nueva contraseña<input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Al menos 8 caracteres"/></label><button className="auth-submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button></form>
    {message && <p className="auth-message" role="status">{message}</p>}
  </section></main>;
}
