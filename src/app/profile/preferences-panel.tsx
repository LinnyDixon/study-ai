"use client";

import { useEffect, useState } from "react";
import { saveMyPreferences } from "@/lib/supabase/preferences";
import { languageChoices, preferenceCopy, type AppLanguage } from "@/lib/app-languages";
import { useAppLocale } from "@/components/app-locale";

type Theme = "light" | "dark" | "system";
type Preferences = { theme: Theme; language: AppLanguage; notifications: boolean; sounds: boolean };

export function PreferencesPanel({ initial }: { initial: Preferences }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState<keyof Preferences | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const { language: globalLanguage, setLanguage, ready: localeReady } = useAppLocale();
  const selectedLanguage = localeReady ? globalLanguage : values.language;
  const copy = preferenceCopy[selectedLanguage];

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", values.theme === "dark" || (values.theme === "system" && media.matches));
    apply();
    if (values.theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [values.theme]);

  useEffect(() => {
    if (localeReady && values.language !== globalLanguage) queueMicrotask(() => setValues(current => ({ ...current, language: globalLanguage })));
  }, [globalLanguage, localeReady, values.language]);

  useEffect(() => {
    try {
      const cachedTheme = localStorage.getItem("study-ai-theme");
      if (cachedTheme === "light" || cachedTheme === "dark" || cachedTheme === "system") {
        queueMicrotask(() => setValues(current => ({ ...current, theme: cachedTheme })));
      }
    } catch { /* Theme remains controlled by the saved account preference. */ }
  }, []);

  async function save<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const previous = values[key];
    setValues(current => ({ ...current, [key]: value }));
    if (key === "language") setLanguage(value as AppLanguage);
    setSaving(key); setMessage(""); setIsError(false);
    try {
      const { error } = await saveMyPreferences({ [key]: value });
      if (error) throw error;
      setMessage(copy.saved);
    } catch {
      if (key === "theme") {
        try { localStorage.setItem("study-ai-theme", String(value)); } catch { /* Keep the current page theme even if storage is blocked. */ }
      } else {
        setValues(current => ({ ...current, [key]: previous }));
        if (key === "language") setLanguage(previous as AppLanguage);
      }
      setIsError(true);
      setMessage(key === "theme" ? copy.themeLocalError : copy.saveError);
    } finally { setSaving(null); }
  }

  async function toggleNotifications(enabled: boolean) {
    if (enabled) {
      if (!("Notification" in window)) { setIsError(true); setMessage(copy.unsupportedNotifications); return; }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") { setIsError(true); setMessage(copy.deniedNotifications); return; }
    }
    await save("notifications", enabled);
  }

  return <section className="panel profile-card profile-preferences-card">
    <div className="profile-card-heading"><div><div className="eyebrow">{copy.heading.toLocaleUpperCase(values.language)}</div><h2>{copy.heading}</h2></div><span className="profile-card-icon">⚙</span></div>
    <label className="profile-setting-row"><span><strong>{copy.theme}</strong><small>{copy.themeHint}</small></span><select value={values.theme} disabled={saving === "theme"} onChange={event => void save("theme", event.target.value as Theme)}><option value="light">{copy.light}</option><option value="dark">{copy.dark}</option><option value="system">{copy.system}</option></select></label>
    <label className="profile-setting-row"><span><strong>{copy.language}</strong><small>{copy.languageHint}</small></span><select value={selectedLanguage} disabled={saving === "language"} aria-label={copy.language} onChange={event => void save("language", event.target.value as AppLanguage)}>{languageChoices.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label>
    <div className="profile-setting-row"><span><strong>{copy.notifications}</strong><small>{copy.notificationHint}</small></span><button type="button" role="switch" aria-checked={values.notifications} className={`profile-switch ${values.notifications ? "on" : ""}`} disabled={saving === "notifications"} onClick={() => void toggleNotifications(!values.notifications)}><span/></button></div>
    <div className="profile-setting-row"><span><strong>{copy.sounds}</strong><small>{copy.soundHint}</small></span><button type="button" role="switch" aria-checked={values.sounds} className={`profile-switch ${values.sounds ? "on" : ""}`} disabled={saving === "sounds"} onClick={() => void save("sounds", !values.sounds)}><span/></button></div>
    {message && <p className={`profile-status ${isError ? "" : "success"}`} role={isError ? "alert" : "status"}>{message}</p>}
  </section>;
}
