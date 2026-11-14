"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AIChat } from "../ai-chat";
import { StudyTools } from "./study-tools";
import { saveMyPreferences } from "@/lib/supabase/preferences";
import { homeCopy, type AppLanguage } from "@/lib/app-languages";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";
import { SpecializedHub, type SpecializedSectionId } from "./specialized-workspace";
import { ImageGenerator } from "./image-generator";
import { PhysicsWorkspace } from "./physics-workspace";
import { ChemistryWorkspace } from "./chemistry-workspace";
import { MathTool } from "./math-tool";
import { PresentationStudio } from "./presentation-studio";
import { motivationQuotes, nextMotivationQuoteIndex } from "@/lib/motivation-quotes";
import "./specialized-workspace.css";

const nav = [["✳", "home"], ["▤", "reader"], ["▦", "exams"], ["◈", "summaries"], ["⌕", "search"], ["✧", "ai"], ["▣", "calendar"], ["▧", "notes"], ["▤", "notebook"]];
const specializedNav: { icon: string; id: SpecializedSectionId; label: string }[] = [
  { icon: "∑", id: "math", label: "Matemática" },
  { icon: "⌁", id: "physics", label: "Física" },
  { icon: "⚗", id: "chemistry", label: "Química" },
  { icon: "▤", id: "slides", label: "Creador de presentaciones" },
  { icon: "▧", id: "images", label: "Generador de imágenes" },
];
type HomePreferences = { theme: "light" | "dark" | "system"; language: AppLanguage; notifications: boolean; sounds: boolean };
type HomeProfile = { displayName: string; email: string; avatarUrl: string | null };

export default function Home({ planName, preferences, profile }: { planName: string; preferences: HomePreferences; profile: HomeProfile }) {
  const [active, setActive] = useState("home");
  const [motivationQuote, setMotivationQuote] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    const key = `study-ai-home-motivation-v1:${profile.email.trim().toLowerCase() || "guest"}`;
    let previous = -1;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) previous = Number(stored);
    } catch { /* Storage can be disabled by the browser. */ }
    const next = nextMotivationQuoteIndex(previous);
    try { window.localStorage.setItem(key, String(next)); } catch { /* A fresh random phrase still works without persistence. */ }
    const frame = window.requestAnimationFrame(() => setMotivationQuote(motivationQuotes[next]));
    return () => window.cancelAnimationFrame(frame);
  }, [profile.email]);
  const [speaking, setSpeaking] = useState(false);
  const [dark, setDark] = useState(preferences.theme === "dark");
  const [theme, setTheme] = useState(preferences.theme);
  const [themeSaveError, setThemeSaveError] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { language: globalLanguage, ready: localeReady } = useAppLocale();
  const language = localeReady ? globalLanguage : preferences.language;
  const copy = homeCopy[language];
  const t = (text: string) => translateUi(language, text);
  const mainNavIndex = nav.findIndex(([, id]) => id === active);
  const selected = mainNavIndex >= 0 ? copy.nav[mainNavIndex] : specializedNav.find((item) => item.id === active)?.label ? t(specializedNav.find((item) => item.id === active)!.label) : (active === "specialized" ? t("Herramientas especializadas") : "");

  function openSpecializedTool(id: SpecializedSectionId) {
    setActive(id);
    setMobileNav(false);
  }

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    try {
      const cachedTheme = localStorage.getItem("study-ai-theme");
      if (cachedTheme === "light" || cachedTheme === "dark" || cachedTheme === "system") {
        queueMicrotask(() => setTheme(cachedTheme));
      }
    } catch { /* Fall back to the account preference. */ }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setDark(theme === "dark" || (theme === "system" && media.matches));
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  async function toggleTheme() {
    const nextTheme = dark ? "light" : "dark";
    setTheme(nextTheme); setDark(nextTheme === "dark"); setThemeSaveError(false);
    const { error } = await saveMyPreferences({ theme: nextTheme });
    if (error) {
      setThemeSaveError(true);
      try { localStorage.setItem("study-ai-theme", nextTheme); } catch { /* The current page still keeps the selected theme. */ }
    }
  }

  function readText() {
    if (!text.trim() || !("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.pause(); setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return <div className={`shell ${dark ? "dark" : ""}`}>
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-mark">s</div>{!collapsed && <span>study<span className="brand-ai">.ai</span></span>}<button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Contraer menú">{collapsed ? "›" : "‹"}</button></div>
      <div className="sidebar-navigation">
      <button className="new-chat" onClick={() => setActive("ai")}><span>＋</span>{!collapsed && copy.newChat}</button>
      <div className="nav-label">{copy.navHeading}</div>
      <nav>{nav.map(([icon, id], index) => { const label = copy.nav[index]; return <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => { setActive(id); setMobileNav(false); }} title={collapsed ? label : undefined}><span className="nav-icon">{icon}</span>{!collapsed && <span>{label}</span>}{id === "ai" && !collapsed && <span className="nav-new">IA</span>}</button>; })}</nav>
      <div className="specialized-nav">
        {!collapsed && <button type="button" className={`nav-label specialized-nav-heading ${active === "specialized" ? "active" : ""}`} onClick={() => { setActive("specialized"); setMobileNav(false); }}>{t("HERRAMIENTAS ESPECIALIZADAS")}</button>}
        <nav aria-label={t("Herramientas especializadas")}>{specializedNav.map(({ icon, id, label }) => <button key={id} type="button" className={`nav-item ${active === id ? "active" : ""}`} onClick={() => openSpecializedTool(id)} title={collapsed ? t(label) : undefined} aria-current={active === id ? "page" : undefined}><span className="nav-icon">{icon}</span>{!collapsed && <span>{t(label)}</span>}</button>)}</nav>
      </div>
      </div>
      {!collapsed && <div className="sidebar-bottom"><div className="storage-card"><span className="storage-icon">☁</span><div><strong>{copy.privacy.split(" · ")[0]}</strong><small>{copy.privacy.split(" · ")[1]}</small></div></div><a className="profile" href="/profile"><div className="avatar" style={profile.avatarUrl ? { backgroundImage: `url("${profile.avatarUrl}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>{!profile.avatarUrl && (profile.displayName || profile.email || "E").slice(0, 1).toUpperCase()}</div><div className="profile-info"><strong>{profile.displayName || copy.profile}</strong><small>{copy.settings}</small></div><span className="dots">···</span></a></div>}
      {collapsed && <a className="profile-mini" title="Perfil" href="/profile" style={profile.avatarUrl ? { backgroundImage: `url("${profile.avatarUrl}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>{!profile.avatarUrl && (profile.displayName || profile.email || "E").slice(0, 1).toUpperCase()}</a>}
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button><div className="breadcrumb">{copy.breadcrumb} <span>/</span> <b>{selected}</b></div><div className="top-actions"><button className="icon-button theme-toggle" title={themeSaveError ? "No se pudo guardar el tema" : "Cambiar tema"} aria-label="Cambiar tema" onClick={() => void toggleTheme()}>{dark ? "☀" : "☾"}</button><button className="upgrade">✦ <span>Hecho para aprender</span></button><a className="avatar small" href="/profile" aria-label={copy.profile} style={profile.avatarUrl ? { backgroundImage: `url("${profile.avatarUrl}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>{!profile.avatarUrl && (profile.displayName || profile.email || "E").slice(0, 1).toUpperCase()}</a></div></header>
      <div className="content">
        {active === "home" ? <>
          <section className="welcome"><div className="eyebrow"><span className="sparkle">✳</span> {copy.tagline}</div><h1>{copy.greeting}, {profile.displayName || copy.nav[0].toLocaleLowerCase()} <span className="wave">✦</span></h1><p>{copy.intro}</p><div className="home-plan-actions"><div className="home-plan-label">{copy.plan}: <strong>{planName}</strong></div><Link className="home-pricing-link" href="/#planes">Ver planes y precios <span aria-hidden="true">→</span></Link></div></section>
          <section className="quick-grid">
            <button className="quick-card violet" onClick={() => setActive("reader")}><div className="card-top"><span className="quick-icon">▤</span><span className="arrow">↗</span></div><strong>{copy.reader}</strong><small>{copy.readerDesc}</small></button>
            <button className="quick-card peach" onClick={() => setActive("exams")}><div className="card-top"><span className="quick-icon">▦</span><span className="arrow">↗</span></div><strong>{copy.exam}</strong><small>{copy.examDesc}</small></button>
            <button className="quick-card mint" onClick={() => setActive("summaries")}><div className="card-top"><span className="quick-icon">◈</span><span className="arrow">↗</span></div><strong>{copy.summary}</strong><small>{copy.summaryDesc}</small></button>
            <button className="quick-card blue" onClick={() => setActive("ai")}><div className="card-top"><span className="quick-icon">✧</span><span className="arrow">↗</span></div><strong>{copy.askAi}</strong><small>{copy.askAiDesc}</small></button>
          </section>
          <section className="motivation-card" aria-label="Frase motivacional" aria-live="polite">
            <span className="motivation-mark" aria-hidden="true">✳</span>
            <div><span className="motivation-eyebrow">UN MENSAJE PARA TI</span><p>{motivationQuote || "Un momento para ti…"}</p></div>
          </section>
          <section className="lower-grid"><div className="panel focus-panel"><div className="panel-heading"><div><div className="eyebrow">{copy.start}</div><h2>{copy.startTitle}</h2></div><span className="heading-icon">✳</span></div><p className="panel-desc">{copy.startIntro}</p><div className="starter-list"><button onClick={() => setActive("reader")}><span className="starter-symbol lavender">▤</span><span><b>{copy.listen}</b><small>{copy.listenDesc}</small></span><span className="starter-arrow">›</span></button><button onClick={() => setActive("notebook")}><span className="starter-symbol yellow">✎</span><span><b>{copy.write}</b><small>{copy.writeDesc}</small></span><span className="starter-arrow">›</span></button><button onClick={() => setActive("ai")}><span className="starter-symbol blue-bg">✧</span><span><b>{copy.understand}</b><small>{copy.understandDesc}</small></span><span className="starter-arrow">›</span></button></div></div>
          <div className="right-stack"><div className="panel calendar-card"><div className="mini-calendar-head"><div><span className="eyebrow">{copy.week}</span><h3>{copy.weekTitle}</h3></div><span className="calendar-emoji">☀</span></div><p>{copy.weekIntro}</p><button className="text-link" onClick={() => setActive("calendar")}>{copy.openCalendar} <span>→</span></button></div></div></section>
          <footer className="home-footer"><span>{copy.footer}</span><span>{copy.privacy}</span></footer>
        </> : active === "reader" ? (planName === "Study Pro" || planName === "L.D.") ? <section className="tool-view"><div className="eyebrow"><span className="sparkle">✳</span> {copy.reader.toLocaleUpperCase(language)}</div><h1>{copy.reader}</h1><p className="tool-intro">{copy.readerIntro}</p><div className="panel reader-panel"><label htmlFor="reader-text">{copy.yourText}</label><textarea id="reader-text" value={text} onChange={e => setText(e.target.value)} placeholder={copy.placeholder}/><div className="reader-controls"><span>{text.length.toLocaleString(language)} {copy.chars}</span><button className="primary-button" onClick={readText} disabled={!text.trim()}>{speaking ? `Ⅱ` : `▷  ${copy.listenButton}`}</button></div></div></section> : <section className="tool-view"><div className="math-lock panel"><span className="math-lock-icon">✦</span><h2>Lector de textos está disponible con Study Pro</h2><p>Actualiza tu plan para escuchar documentos con STUDY AI.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div></section> : active === "ai" ? (planName === "Study Plus" || planName === "Study Pro" || planName === "L.D.") ? <section className="tool-view ai-tool-view"><div className="eyebrow"><span className="sparkle">✳</span> {copy.askAi}</div><AIChat language={language}/></section> : <section className="tool-view"><div className="math-lock panel"><span className="math-lock-icon">✦</span><h2>IA Libre está disponible con Study Plus y Study Pro</h2><p>Actualiza tu plan para usar el asistente personal.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div></section> : active === "specialized" ? <SpecializedHub onOpen={openSpecializedTool} language={language}/> : active === "chemistry" ? <ChemistryWorkspace allowed={planName === "Study Plus" || planName === "Study Pro" || planName === "L.D."} onBack={() => setActive("specialized")} language={language}/> : active === "math" ? <MathTool onBack={() => setActive("specialized")} enabled={planName === "Study Plus" || planName === "Study Pro" || planName === "L.D."}/> : active === "physics" ? <PhysicsWorkspace allowed={planName === "Study Plus" || planName === "Study Pro" || planName === "L.D."} onBack={() => setActive("specialized")}/> : active === "slides" ? planName === "Study Pro" || planName === "L.D." ? <PresentationStudio/> : <section className="tool-view"><div className="math-lock panel"><span className="math-lock-icon">✦</span><h2>El creador de presentaciones está disponible con Study Pro</h2><p>Actualiza tu plan para crear, editar y exportar presentaciones con STUDY AI.</p><a className="primary-button math-link" href="/plans">Ver planes</a></div></section> : active === "images" ? <ImageGenerator onBack={() => setActive("specialized")} language={language}/> : <StudyTools active={active} language={language}/>}
      </div>
    </main>
  </div>;
}


