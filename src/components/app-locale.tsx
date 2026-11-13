"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";
import type { AppLanguage } from "@/lib/app-languages";

type LocaleContextValue = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; ready: boolean };
const LocaleContext = createContext<LocaleContextValue>({ language: "es", setLanguage: () => undefined, ready: false });
const allowed: AppLanguage[] = ["es", "en", "pt-BR", "fr", "de", "zh-CN", "ja"];

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("es");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const cached = localStorage.getItem("study-ai-language");
        if (alive && cached && allowed.includes(cached as AppLanguage)) setLanguageState(cached as AppLanguage);
        if (getSupabaseConfig()) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from("user_preferences").select("preferences").eq("user_id", user.id).maybeSingle();
            const saved = data?.preferences && typeof data.preferences === "object" ? (data.preferences as Record<string, unknown>).language : null;
            if (alive && typeof saved === "string" && allowed.includes(saved as AppLanguage)) {
              setLanguageState(saved as AppLanguage);
              localStorage.setItem("study-ai-language", saved);
            }
          }
        }
      } catch { /* Keep the locally selected/default language if the account is unavailable. */ }
      finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    try { localStorage.setItem("study-ai-language", next); } catch { /* UI still changes for this session. */ }
  };

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LocaleContext.Provider value={{ language, setLanguage, ready }}>{children}</LocaleContext.Provider>;
}

export function useAppLocale() { return useContext(LocaleContext); }
