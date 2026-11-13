"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";

const BUCKET = "profile-avatars";

export function AvatarPicker({ displayName, email, avatarUrl, avatarPath }: {
  displayName: string; email: string; avatarUrl: string | null; avatarPath: string | null;
}) {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(avatarUrl);
  const [currentPath, setCurrentPath] = useState(avatarPath);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const initial = (displayName || email || "E").trim().slice(0, 1).toLocaleUpperCase();

  async function upload(file: File) {
    setBusy(true); setMessage(""); setError(false);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(t("Elige una foto JPG, PNG o WebP."));
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Inicia sesión nuevamente para cambiar tu foto.");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (profileError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw profileError;
      }
      const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      setImageUrl(signedError ? null : signed.signedUrl);
      setCurrentPath(path);
      setMessage(signedError ? (language === "en" ? "Photo saved. Reload the page to see it." : "Foto guardada. Recarga la página para verla.") : t("Foto actualizada."));
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "No se pudo subir la foto.");
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function remove() {
    if (!currentPath) return;
    setBusy(true); setMessage(""); setError(false);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Inicia sesión nuevamente para cambiar tu foto.");
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (profileError) throw profileError;
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([currentPath]);
      setImageUrl(null); setCurrentPath(null);
      if (storageError) throw storageError;
      setMessage(t("Foto eliminada."));
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "No se pudo eliminar la foto.");
    } finally { setBusy(false); }
  }

  return <div className="profile-avatar-editor">
    <div className="profile-avatar-large" role={imageUrl ? "img" : undefined} aria-label={imageUrl ? `${t("Foto de perfil")} ${displayName || email}` : undefined} style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>{!imageUrl && initial}</div>
    <div className="profile-avatar-actions"><strong>{t("Foto de perfil")}</strong><small>{t("JPG, PNG o WebP")}</small><div><button type="button" className="profile-small-button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? t("Procesando…") : imageUrl ? t("Cambiar foto") : t("Subir foto")}</button>{imageUrl && <button type="button" className="profile-text-danger" disabled={busy} onClick={() => void remove()}>{language === "en" ? "Delete" : "Eliminar"}</button>}</div>{message && <span className={error ? "profile-inline-error" : "profile-inline-success"} role="status">{message}</span>}</div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("Seleccionar foto de perfil")} disabled={busy} onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void upload(file); }}/>
  </div>;
}
