"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";

function getBrowserLabel(language: string) {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent) ? "Microsoft Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Google Chrome" : /Safari\//.test(agent) ? "Safari" : "Navegador web";
  const mobile = /Android|iPhone|iPad|Mobile/i.test(agent);
  const device = mobile ? (language === "en" ? "mobile" : language === "fr" ? "mobile" : language === "de" ? "Mobilgerät" : language === "zh-CN" ? "移动设备" : language === "ja" ? "モバイル" : language === "pt-BR" ? "celular" : "móvil") : (language === "en" ? "computer or tablet" : language === "fr" ? "ordinateur ou tablette" : language === "de" ? "Computer oder Tablet" : language === "zh-CN" ? "电脑或平板" : language === "ja" ? "パソコンまたはタブレット" : language === "pt-BR" ? "computador ou tablet" : "computadora o tablet");
  return `${browser} · ${device}`;
}

export function SecurityPanel({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  const router = useRouter();
  const [device, setDevice] = useState("Este navegador");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function sendVerificationCode() {
    setCodeBusy(true); setMessage(""); setError(false);
    try {
      const { error: sendError } = await createClient().auth.reauthenticate();
      if (sendError) throw sendError;
      setCodeSent(true);
      setMessage(`${t("Enviamos un código de verificación a")} ${email}.`);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "No se pudo enviar el código. Inténtalo más tarde.");
    } finally { setCodeBusy(false); }
  }

  useEffect(() => {
    void Promise.resolve().then(() => setDevice(getBrowserLabel(language)));
    void createClient().auth.getSession().then(({ data }) => {
      setExpiresAt(data.session?.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString(language) : null);
    });
  }, [language]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true); setMessage(""); setError(false);
    const targetForm = event.currentTarget;
    const form = new FormData(targetForm);
    const password = String(form.get("new_password") || "");
    const confirm = String(form.get("confirm_password") || "");
    const nonce = String(form.get("verification_code") || "").trim();
    if (!codeSent || !nonce) { setError(true); setMessage(t("Primero solicita e ingresa el código enviado a tu correo.")); setPasswordBusy(false); return; }
    if (password.length < 8) { setError(true); setMessage(t("La contraseña debe tener al menos 8 caracteres.")); setPasswordBusy(false); return; }
    if (password !== confirm) { setError(true); setMessage(t("Las contraseñas no coinciden.")); setPasswordBusy(false); return; }
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password, nonce });
      if (updateError) throw updateError;
      targetForm.reset();
      setCodeSent(false);
      setMessage(t("Contraseña actualizada."));
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally { setPasswordBusy(false); }
  }

  async function signOutEverywhere() {
    const signOutPrompt = language === "en" ? "You will be signed out on all devices, including this one. Continue?" : language === "fr" ? "Vous serez déconnecté de tous les appareils, y compris celui-ci. Continuer ?" : language === "de" ? "Du wirst auf allen Geräten abgemeldet, auch auf diesem. Fortfahren?" : language === "zh-CN" ? "你将在所有设备（包括此设备）上退出登录。是否继续？" : language === "ja" ? "この端末を含むすべての端末からログアウトします。続行しますか？" : language === "pt-BR" ? "Você sairá de todos os dispositivos, incluindo este. Continuar?" : "Se cerrará tu sesión en todos los dispositivos, incluido este. ¿Continuar?";
    if (!window.confirm(signOutPrompt)) return;
    setGlobalBusy(true); setMessage(""); setError(false);
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) { setError(true); setMessage("No se pudieron cerrar todas las sesiones. Comprueba tu conexión e inténtalo otra vez."); setGlobalBusy(false); return; }
    router.replace("/auth/sign-in?notice=all-sessions-closed");
    router.refresh();
  }

  async function deleteAccount() {
    const confirmationWord = language === "en" ? "DELETE" : language === "fr" ? "SUPPRIMER" : language === "de" ? "LÖSCHEN" : language === "zh-CN" ? "删除" : language === "ja" ? "削除" : language === "pt-BR" ? "EXCLUIR" : "ELIMINAR";
    const deletePrompt = language === "en" ? `This action is permanent. Type ${confirmationWord} to confirm.` : language === "fr" ? `Cette action est irréversible. Saisissez ${confirmationWord} pour confirmer.` : language === "de" ? `Diese Aktion ist dauerhaft. Gib ${confirmationWord} zur Bestätigung ein.` : language === "zh-CN" ? `此操作无法撤销。输入 ${confirmationWord} 以确认。` : language === "ja" ? `この操作は取り消せません。確認するには ${confirmationWord} と入力してください。` : language === "pt-BR" ? `Esta ação é permanente. Digite ${confirmationWord} para confirmar.` : `Esta acción es permanente. Escribe ${confirmationWord} para confirmar.`;
    if (window.prompt(deletePrompt) !== confirmationWord) return;
    setDeleteBusy(true); setMessage(""); setError(false);
    const supabase = createClient();
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Inicia sesión nuevamente para eliminar tu cuenta.");
      const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      if (profile?.avatar_url) {
        const { error: photoError } = await supabase.storage.from("profile-avatars").remove([profile.avatar_url]);
        if (photoError) throw new Error("No se pudo eliminar la foto de perfil. La cuenta sigue activa; vuelve a intentar después.");
      }
      const { error: deleteError } = await supabase.rpc("delete_my_account");
      if (deleteError) throw deleteError;
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "No se pudo eliminar la cuenta.");
      setDeleteBusy(false);
    }
  }

  return <section className="panel profile-card profile-security-full-card">
    <div className="profile-card-heading"><div><div className="eyebrow">{t("PROTEGE TU CUENTA")}</div><h2>{t("Seguridad y privacidad")}</h2></div><span className="profile-card-icon">⌑</span></div>
    <div className="profile-security-columns">
      <div className="profile-security-block">
        <div className="profile-security-title"><span aria-hidden="true">⌑</span><h3>{t("Cambiar contraseña")}</h3></div><p>{t("Antes de guardar una contraseña nueva, verifica que eres tú con un código de un solo uso enviado a tu correo.")}</p>
        {!emailVerified ? <p className="profile-security-note">{t("Verifica primero el correo de tu cuenta para recibir el código de seguridad.")}</p> : <>
          {!codeSent && <button className="profile-small-button" type="button" onClick={() => void sendVerificationCode()} disabled={codeBusy}>{codeBusy ? t("Enviando código…") : t("Enviar código a mi correo")}</button>}
          <form className={`profile-password-form ${codeSent ? "is-verified-step" : "is-locked-step"}`} onSubmit={changePassword}>
            {codeSent && <label>{t("Código de verificación")}<input name="verification_code" type="text" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} pattern="[0-9]{6,8}" placeholder={t("Código recibido por correo")} required/></label>}
            <label>{t("Nueva contraseña")}<input name="new_password" type="password" minLength={8} autoComplete="new-password" required disabled={!codeSent}/></label>
            <label>{t("Confirmar contraseña")}<input name="confirm_password" type="password" minLength={8} autoComplete="new-password" required disabled={!codeSent}/></label>
            {codeSent && <div className="profile-password-actions"><button className="profile-small-button" type="submit" disabled={passwordBusy}>{passwordBusy ? t("Verificando y guardando…") : t("Verificar código y cambiar contraseña")}</button><button className="profile-resend-code" type="button" onClick={() => void sendVerificationCode()} disabled={codeBusy}>{codeBusy ? t("Enviando…") : t("Enviar otro código")}</button></div>}
          </form>
        </>}
      </div>
      <div className="profile-security-block">
        <div className="profile-security-title"><span aria-hidden="true">◉</span><h3>{t("Sesiones y dispositivos")}</h3></div><p>{t("Sesión de")} <b>{email}</b> {t("en este dispositivo.")}</p><div className="profile-session-detail"><strong>{device}</strong><small>{expiresAt ? `${t("Sesión válida hasta")} ${expiresAt}` : t("Sesión activa en este navegador")}</small></div>
        <p className="profile-fineprint">{t("Supabase no proporciona a esta aplicación un listado de las demás sesiones. Puedes revocarlas todas con el botón siguiente.")}</p>
        <button className="profile-small-button" type="button" onClick={() => void signOutEverywhere()} disabled={globalBusy}>{globalBusy ? t("Cerrando…") : t("Cerrar sesión en todos los dispositivos")}</button>
      </div>
      <div className="profile-security-block">
        <div className="profile-security-title"><span aria-hidden="true">↓</span><h3>{t("Descargar tus datos")}</h3></div><p>{t("Exporta los datos de perfil, preferencias, plan y conversaciones que STUDY AI tiene guardados para tu cuenta.")}</p><a className="profile-small-button profile-download" href="/api/profile/export">{t("Descargar mis datos (.json)")}</a>
      </div>
      <div className="profile-security-block profile-danger-zone">
        <div className="profile-security-title"><span aria-hidden="true">!</span><h3>{t("Eliminar cuenta")}</h3></div><p>{t("Elimina permanentemente tu perfil, preferencias, conversaciones y plan. No se puede deshacer.")}</p><button className="profile-danger-button" type="button" disabled={deleteBusy} onClick={() => void deleteAccount()}>{deleteBusy ? t("Eliminando…") : t("Eliminar mi cuenta")}</button>
      </div>
    </div>
    <p className="profile-two-factor-note">{t("La autenticación en dos pasos todavía no está habilitada en esta aplicación.")}</p>
    {message && <p className={`profile-status ${error ? "" : "success"}`} role={error ? "alert" : "status"}>{message}</p>}
  </section>;
}
