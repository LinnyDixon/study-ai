"use client";

import { useState } from "react";
import { AIChat } from "../ai-chat";
import { StudyTools } from "./study-tools";

const nav = [
  ["✳", "Inicio", "home"], ["▤", "Lector", "reader"], ["▦", "Exámenes", "exams"],
  ["◈", "Resúmenes", "summaries"], ["⌕", "Investigar", "search"], ["✧", "IA libre", "ai"],
  ["▣", "Calendario", "calendar"], ["▧", "Agenda", "notes"], ["▤", "Libreta", "notebook"],
];

export default function Home() {
  const [active, setActive] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const selected = nav.find(([,, id]) => id === active)?.[1] || "Inicio";

  function readText() {
    if (!text.trim() || !("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.pause(); setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-UY";
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return <div className={`shell ${dark ? "dark" : ""}`}>
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-mark">s</div>{!collapsed && <span>study<span className="brand-ai">.ai</span></span>}<button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="Contraer menú">{collapsed ? "›" : "‹"}</button></div>
      <button className="new-chat" onClick={() => setActive("ai")}><span>＋</span>{!collapsed && "Nueva conversación"}</button>
      <div className="nav-label">ESPACIO DE ESTUDIO</div>
      <nav>{nav.map(([icon, label, id]) => <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => { setActive(id); setMobileNav(false); }} title={collapsed ? label : undefined}><span className="nav-icon">{icon}</span>{!collapsed && <span>{label}</span>}{id === "ai" && !collapsed && <span className="nav-new">IA</span>}</button>)}</nav>
      {!collapsed && <div className="sidebar-bottom"><div className="storage-card"><span className="storage-icon">☁</span><div><strong>Tu espacio personal</strong><small>Materiales privados de estudio</small></div></div><a className="profile" href="/profile"><div className="avatar">L</div><div className="profile-info"><strong>Perfil y cuenta</strong><small>Configuración personal</small></div><span className="dots">···</span></a></div>}
      {collapsed && <a className="profile-mini" title="Perfil" href="/profile">L</a>}
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button><div className="breadcrumb">Mi espacio <span>/</span> <b>{selected}</b></div><div className="top-actions"><button className="icon-button theme-toggle" title="Cambiar tema" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}</button><button className="upgrade">✦ <span>Hecho para aprender</span></button><a className="avatar small" href="/profile" aria-label="Abrir perfil">L</a></div></header>
      <div className="content">
        {active === "home" ? <>
          <section className="welcome"><div className="eyebrow"><span className="sparkle">✳</span> TU ESPACIO PARA APRENDER MEJOR</div><h1>Hola, Linny <span className="wave">✦</span></h1><p>Un lugar tranquilo para estudiar, organizar tus ideas y avanzar a tu ritmo.</p></section>
          <section className="quick-grid">
            <button className="quick-card violet" onClick={() => setActive("reader")}><div className="card-top"><span className="quick-icon">▤</span><span className="arrow">↗</span></div><strong>Lector de textos</strong><small>Lee y escucha tus materiales</small></button>
            <button className="quick-card peach" onClick={() => setActive("exams")}><div className="card-top"><span className="quick-icon">▦</span><span className="arrow">↗</span></div><strong>Practica para un examen</strong><small>Convierte tus apuntes en práctica</small></button>
            <button className="quick-card mint" onClick={() => setActive("summaries")}><div className="card-top"><span className="quick-icon">◈</span><span className="arrow">↗</span></div><strong>Resume tus apuntes</strong><small>Quédate con las ideas clave</small></button>
            <button className="quick-card blue" onClick={() => setActive("ai")}><div className="card-top"><span className="quick-icon">✧</span><span className="arrow">↗</span></div><strong>Pregunta a la IA</strong><small>Explora cualquier tema</small></button>
          </section>
          <section className="lower-grid"><div className="panel focus-panel"><div className="panel-heading"><div><div className="eyebrow">PARA EMPEZAR</div><h2>¿Qué tienes en mente?</h2></div><span className="heading-icon">✳</span></div><p className="panel-desc">Elige una herramienta y transforma tus materiales en una sesión de estudio.</p><div className="starter-list"><button onClick={() => setActive("reader")}><span className="starter-symbol lavender">▤</span><span><b>Quiero escuchar un texto</b><small>Usa la voz de tu navegador, sin IA</small></span><span className="starter-arrow">›</span></button><button onClick={() => setActive("notebook")}><span className="starter-symbol yellow">✎</span><span><b>Quiero escribir una idea</b><small>Abre tu espacio para tomar notas</small></span><span className="starter-arrow">›</span></button><button onClick={() => setActive("ai")}><span className="starter-symbol blue-bg">✧</span><span><b>Quiero entender un tema</b><small>Conversa con tu asistente de estudio</small></span><span className="starter-arrow">›</span></button></div></div>
          <div className="right-stack"><div className="panel calendar-card"><div className="mini-calendar-head"><div><span className="eyebrow">TU SEMANA</span><h3>Un paso a la vez</h3></div><span className="calendar-emoji">☀</span></div><p>Cuando agregues fechas importantes, aparecerán aquí.</p><button className="text-link" onClick={() => setActive("calendar")}>Abrir calendario <span>→</span></button></div><div className="tip-card"><span className="tip-mark">✳</span><div><b>Un consejo para hoy</b><p>Estudiar un poco cada día ayuda a recordar mejor. Empieza con 15 minutos.</p></div></div></div></section>
          <footer className="home-footer"><span>Tu espacio, a tu ritmo.</span><span>Privado por diseño <i>·</i> Progreso en este dispositivo</span></footer>
        </> : active === "reader" ? <section className="tool-view"><div className="eyebrow"><span className="sparkle">✳</span> HERRAMIENTA DE ESTUDIO</div><h1>Lector de textos</h1><p className="tool-intro">Pega un texto y escúchalo con las voces disponibles en tu dispositivo.</p><div className="panel reader-panel"><label htmlFor="reader-text">Tu texto</label><textarea id="reader-text" value={text} onChange={e => setText(e.target.value)} placeholder="Pega o escribe aquí el texto que quieres escuchar…"/><div className="reader-controls"><span>{text.length.toLocaleString("es-UY")} caracteres · procesamiento local</span><button className="primary-button" onClick={readText} disabled={!text.trim()}>{speaking ? "Ⅱ  Pausar lectura" : "▷  Escuchar texto"}</button></div></div><div className="notice">La lectura en voz alta usa la función de voz de tu navegador. Importación de documentos y guardado en cuenta se incorporarán en las siguientes etapas.</div></section> : active === "ai" ? <section className="tool-view ai-tool-view"><div className="eyebrow"><span className="sparkle">✳</span> IA PRIVADA PARA ESTUDIAR</div><AIChat/></section> : <StudyTools active={active} />}
      </div>
    </main>
  </div>;
}
