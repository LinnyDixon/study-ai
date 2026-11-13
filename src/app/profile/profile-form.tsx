"use client";

import Link from "next/link";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";
import { signOut, updateProfile } from "./actions";
import { AvatarPicker } from "./profile-controls";
import { PreferencesPanel } from "./preferences-panel";
import { SecurityPanel } from "./security-panel";
import { SubscriptionCard } from "./subscription-card";
import type { AppLanguage } from "@/lib/app-languages";
import { getSupportComposeUrl } from "@/lib/support";

function formatDate(value: string | null, language: import("@/lib/app-languages").AppLanguage) {
  if (!value) return translateUi(language, "No disponible");
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? translateUi(language, "No disponible") : date.toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function ProfileForm({
  displayName, email, emailVerified, createdAt, avatarUrl, avatarPath, preferences,
  planName, planPaymentStatus, planEndsAt, saved, error,
}: {
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  preferences: Record<string, unknown>;
  planName: string | null;
  planPaymentStatus: string | null;
  planEndsAt: string | null;
  saved: boolean;
  error?: string;
}) {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  const initial = preferences as { theme?: unknown; language?: unknown; notifications?: unknown; sounds?: unknown };
  const accountError = error === "name" ? (language === "en" ? "Name must be between 1 and 80 characters." : "El nombre debe tener entre 1 y 80 caracteres.") : error === "save" ? (language === "en" ? "Could not save profile changes." : "No se pudieron guardar los cambios del perfil.") : "";

  return <div className="profile-section-grid">
    <section className="panel profile-card profile-personal-card">
      <div className="profile-card-heading"><div><div className="eyebrow">{t("TU PERFIL")}</div><h2>{t("Información personal")}</h2></div><span className="profile-card-icon">◉</span></div>
      <div className="profile-identity">
        <AvatarPicker displayName={displayName} email={email} avatarUrl={avatarUrl} avatarPath={avatarPath}/>
        <div className="profile-identity-copy"><strong>{displayName || t("Estudiante")}</strong><small>{email}</small><span className={`profile-verified ${emailVerified ? "is-verified" : "is-unverified"}`}><i/>{t(emailVerified ? "Correo verificado" : "Correo sin verificar")}</span></div>
      </div>
      <form action={updateProfile} className="profile-form">
        <label htmlFor="display_name">{t("Nombre para mostrar")}</label>
        <input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} required placeholder={t("Tu nombre")}/>
        <small>{t("Este nombre aparece en tu espacio de estudio.")}</small>
        <div className="profile-account-date"><span>{t("Cuenta creada")}</span><strong>{formatDate(createdAt, language)}</strong></div>
        {saved && <p className="profile-status success" role="status">{t("Cambios guardados correctamente.")}</p>}
        {accountError && <p className="profile-status" role="alert">{accountError}</p>}
        <button className="primary-button profile-save" type="submit">{t("Guardar cambios")}</button>
      </form>
    </section>

    <PreferencesPanel initial={{
      theme: initial.theme === "dark" || initial.theme === "system" ? initial.theme : "light",
      language: ["es", "en", "pt-BR", "fr", "de", "zh-CN", "ja"].includes(String(initial.language)) ? initial.language as AppLanguage : "es",
      notifications: initial.notifications === true,
      sounds: initial.sounds === true,
    }}/>

    <SecurityPanel email={email} emailVerified={emailVerified}/>

    <SubscriptionCard planName={planName} paymentStatus={planPaymentStatus} endsAt={planEndsAt}/>

    <section className="panel profile-card profile-help-card">
      <div className="profile-card-heading"><div><div className="eyebrow">{t("¿NECESITAS AYUDA?")}</div><h2>{t("Ayuda y soporte")}</h2></div><span className="profile-card-icon">?</span></div>
      <p className="profile-card-description">{t("Encuentra respuestas sobre tu cuenta y cómo funciona STUDY AI.")}</p>
      <div className="profile-help-links"><Link href="/help"><i aria-hidden="true">?</i><span>{t("Centro de ayuda y preguntas frecuentes")}</span><b>↗</b></Link><a href={getSupportComposeUrl()} target="_blank" rel="noreferrer"><i aria-hidden="true">✉</i><span>{t("Contactar con soporte")}</span><b>↗</b></a><Link href="/privacy"><i aria-hidden="true">◈</i><span>{t("Política de privacidad")}</span><b>↗</b></Link><Link href="/terms"><i aria-hidden="true">≡</i><span>{t("Términos de uso")}</span><b>↗</b></Link></div>
    </section>

    <section className="panel profile-card profile-signout-card"><div><div className="eyebrow">{t("SESIÓN ACTUAL")}</div><h2>{t("Salir de STUDY AI")}</h2><p className="profile-card-description">{t("Cierra la sesión de esta cuenta en este dispositivo.")}</p></div><form action={signOut}><button className="signout-button" type="submit">{t("Cerrar sesión")}</button></form></section>
  </div>;
}

export function ProfilePageHeader() {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  return <header className="profile-page-header"><div><div className="eyebrow"><span className="sparkle">✳</span> {t("TU ESPACIO PERSONAL")}</div><h1>{t("Perfil y cuenta")}</h1><p className="tool-intro">{t("Administra tus datos, preferencias y seguridad desde un solo lugar.")}</p></div><span className="profile-header-mark" aria-hidden="true">S</span></header>;
}
