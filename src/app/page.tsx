import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "STUDY AI — Tu espacio para estudiar desde cualquier lugar",
  description: "Lee textos, conversa con una IA de estudio con Ollama y organiza tu aprendizaje desde el celular o la computadora.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "STUDY AI — Aprende a tu ritmo",
    description: "Un espacio de estudio para leer, preguntar y organizar tus ideas desde cualquier dispositivo.",
    type: "website",
    locale: "es_UY",
  },
};

export default function LandingPage() {
  const accountsReady = Boolean(getSupabaseConfig());

  return <main className="landing-page">
    <header className="landing-nav"><Link className="landing-brand" href="/"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link><nav><a href="#herramientas">Herramientas</a><a href="#dispositivos">Acceso</a></nav><Link className="landing-login" href="/auth/sign-in">Iniciar sesión</Link></header>
    <section className="landing-hero"><div className="landing-hero-copy"><div className="eyebrow"><span className="sparkle">✳</span> TU ESPACIO PERSONAL DE ESTUDIO</div><h1>Estudia a tu ritmo.<br/><span>Desde donde estés.</span></h1><p>Lee tus materiales, conversa con un asistente de IA y enfócate en aprender. Abre STUDY AI desde el navegador del celular o la computadora.</p><div className="landing-ctas">{accountsReady ? <><Link className="landing-primary" href="/auth/sign-up?next=%2Fapp">Crear mi cuenta <span>→</span></Link><Link className="landing-secondary" href="/auth/sign-in?next=%2Fapp">Ya tengo cuenta</Link></> : <Link className="landing-primary" href="/auth/configuration">Preparar acceso a STUDY AI <span>→</span></Link>}</div><div className="landing-reassurance"><span>✳</span> Tus conversaciones son tuyas <i>·</i> IA con Ollama</div></div><div className="landing-preview"><div className="preview-top"><div className="preview-dots"><i/><i/><i/></div><span>study.ai / mi espacio</span><span className="preview-star">✳</span></div><div className="preview-body"><div className="preview-sidebar"><div className="preview-logo"><span/> STUDY AI</div><div className="preview-nav active">✧ &nbsp; IA libre</div><div className="preview-nav">▤ &nbsp; Lector</div><div className="preview-nav">▦ &nbsp; Exámenes</div></div><div className="preview-chat"><div className="preview-greeting"><span>✧</span><b>¿Qué te gustaría entender?</b><small>Pregunta, explora una idea o pide ayuda con tus estudios.</small></div><div className="preview-prompt">Explícame la fotosíntesis paso a paso <span>↗</span></div><div className="preview-input">Escribe tu pregunta… <i>↑</i></div></div></div><div className="preview-caption"><span className="preview-caption-icon">✧</span><span><b>IA libre con Ollama</b><small>Un asistente para aprender y explorar ideas</small></span><span className="preview-local">● LOCAL</span></div></div></section>
    <section className="landing-tools" id="herramientas"><div className="landing-section-heading"><div className="eyebrow">HERRAMIENTAS DE ESTUDIO</div><h2>Menos vueltas. Más aprendizaje.</h2><p>Una interfaz sencilla para concentrarte en lo que estás estudiando.</p></div><div className="landing-tool-grid"><article className="landing-tool-card lavender"><span className="landing-tool-icon">✧</span><h3>IA libre</h3><p>Pregunta, pide explicaciones y conversa con Ollama para estudiar conceptos.</p><span className="tool-state ready">Disponible</span></article><article className="landing-tool-card peach"><span className="landing-tool-icon">▤</span><h3>Lector de textos</h3><p>Pega un texto y escúchalo con las voces que ofrece tu navegador.</p><span className="tool-state ready">Disponible</span></article><article className="landing-tool-card mint"><span className="landing-tool-icon">▦</span><h3>Tu espacio personal</h3><p>Cuando la cuenta esté configurada, guarda tus conversaciones y preferencias.</p><span className={`tool-state ${accountsReady ? "ready" : "setup"}`}>{accountsReady ? "Crea tu cuenta" : "Configuración pendiente"}</span></article></div></section>
    <section className="landing-access" id="dispositivos"><div className="access-orbit"><span className="orbit-main">✳</span><span className="orbit-device">▯</span><span className="orbit-laptop">▰</span></div><div><div className="eyebrow">UN SOLO ACCESO</div><h2>Tu estudio te acompaña.</h2><p>Cuando STUDY AI esté publicado, abre el mismo sitio desde otra computadora o desde tu celular. Con una cuenta Supabase configurada, las conversaciones también se sincronizan entre tus dispositivos.</p>{accountsReady ? <Link href="/auth/sign-up?next=%2Fapp" className="text-link">Crear cuenta <span>→</span></Link> : <Link href="/auth/configuration" className="text-link">Ver qué falta para activar cuentas <span>→</span></Link>}</div></section>
    <footer className="landing-footer"><Link className="landing-brand" href="/"><span className="brand-mark">s</span><span>study<span className="brand-ai">.ai</span></span></Link><span>Un espacio tranquilo para aprender, creado para crecer.</span><span>STUDY AI · En desarrollo</span></footer>
  </main>;
}
