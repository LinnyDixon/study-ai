"use client";

import { useState } from "react";
import type { AppLanguage } from "@/lib/app-languages";
import { translateUi } from "@/lib/ui-translation";
import "./specialized-workspace.css";

export type SpecializedToolId = "slides" | "images";
export type SpecializedSectionId = SpecializedToolId | "math" | "physics" | "chemistry";

const toolInfo: Record<SpecializedToolId, { title: string; icon: string; intro: string; tabs: string[]; topics: string[]; availability: string }> = {
  slides: {
    title: "Creador de presentaciones", icon: "▤", intro: "Prepara aquí tus futuras presentaciones de estudio.",
    tabs: ["Crear", "Mis proyectos"], topics: [],
    availability: "La creación y edición de presentaciones todavía no están habilitadas.",
  },
  images: {
    title: "Generador de imágenes", icon: "▧", intro: "Un espacio reservado para crear imágenes para tus materiales.",
    tabs: ["Crear", "Mis imágenes"], topics: [],
    availability: "La generación de imágenes todavía no está habilitada.",
  },
};

const hubItems: { id: SpecializedSectionId; icon: string; title: string; description: string }[] = [
  { id: "math", icon: "∑", title: "Matemática", description: "Herramientas de práctica matemática." },
  { id: "physics", icon: "⌁", title: "Física", description: "Conceptos y ejercicios de física." },
  { id: "chemistry", icon: "⚗", title: "Química", description: "Explora los elementos de la tabla periódica." },
  { id: "slides", icon: "▤", title: "Creador de presentaciones", description: "Un espacio para tus futuras presentaciones." },
  { id: "images", icon: "▧", title: "Generador de imágenes", description: "Crea, guarda y vuelve a descargar tus imágenes con IA." },
];

export function SpecializedHub({ onOpen, language }: { onOpen: (id: SpecializedSectionId) => void; language: AppLanguage }) {
  const t = (text: string) => translateUi(language, text);
  return <section className="tool-view specialized-page">
    <div className="eyebrow">STUDY AI · {t("HERRAMIENTAS ESPECIALIZADAS")}</div>
    <h1>{t("Herramientas especializadas")}</h1>
    <p className="tool-intro">{t("Elige un espacio de estudio.")}</p>
    <div className="specialized-hub-grid">
      {hubItems.map((item) => <button className="specialized-hub-card" type="button" key={item.id} onClick={() => onOpen(item.id)}>
        <span className="specialized-hub-icon" aria-hidden="true">{item.icon}</span>
        <span className="specialized-hub-copy"><strong>{t(item.title)}</strong><small>{t(item.description)}</small></span>
        <span className="specialized-hub-arrow" aria-hidden="true">↗</span>
      </button>)}
    </div>
  </section>;
}

export function SpecializedWorkspace({ tool, onBack, language }: { tool: SpecializedToolId; onBack: () => void; language: AppLanguage }) {
  const t = (text: string) => translateUi(language, text);
  const config = toolInfo[tool];
  const [activeTab, setActiveTab] = useState(config.tabs[0]);
  return <section className="tool-view specialized-page">
    <button className="specialized-back" type="button" onClick={onBack}>← {t("Volver a Herramientas especializadas")}</button>
    <div className="specialized-title-row"><span className="specialized-title-icon" aria-hidden="true">{config.icon}</span><div><div className="eyebrow">{t("HERRAMIENTAS ESPECIALIZADAS")}</div><h1>{t(config.title)}</h1></div></div>
    <p className="tool-intro">{t(config.intro)}</p>
    <nav className="specialized-tabs" aria-label={`${language === "en" ? "Sections for" : language === "fr" ? "Sections de" : language === "de" ? "Bereiche für" : language === "zh-CN" ? "分区：" : language === "ja" ? "セクション：" : language === "pt-BR" ? "Seções de" : "Secciones de"} ${t(config.title)}`}>
      {config.tabs.map((tab) => <button type="button" key={tab} className={activeTab === tab ? "active" : ""} aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)}>{t(tab)}</button>)}
    </nav>
    {activeTab === "Áreas" ? <section className="specialized-topic-grid" aria-label={`Áreas de ${config.title}`}>
      {config.topics.map((topic, index) => <article className="specialized-topic-card panel" key={topic}><span>{String(index + 1).padStart(2, "0")}</span><h2>{t(topic)}</h2><p>{language === "en" ? `This space will open when ${config.title.toLowerCase()} tools are added.` : language === "fr" ? `Cet espace sera disponible lorsque les fonctions de ${config.title.toLowerCase()} seront ajoutées.` : language === "de" ? `Dieser Bereich wird verfügbar, sobald Funktionen für ${config.title.toLowerCase()} hinzugefügt werden.` : language === "zh-CN" ? "相关功能添加后，此空间将开放。" : language === "ja" ? "関連機能の追加後に利用できます。" : language === "pt-BR" ? `Este espaço será habilitado quando as funções de ${config.title.toLowerCase()} forem adicionadas.` : `Este espacio se habilitará cuando se agreguen las funciones de ${config.title.toLocaleLowerCase()}.`}</p></article>)}
    </section> : activeTab === "Estado" ? <section className="specialized-status panel"><span className="specialized-status-icon">✳</span><h2>{t("Preparación de la herramienta")}</h2><p>{t(config.availability)}</p></section> : activeTab === "Mis proyectos" || activeTab === "Mis imágenes" ? <section className="specialized-status panel"><span className="specialized-status-icon">▱</span><h2>{t(activeTab === "Mis proyectos" ? "Todavía no hay proyectos" : "Todavía no hay imágenes")}</h2><p>{t("Esta sección estará disponible cuando se implemente la creación y el guardado.")}</p></section> : <section className="specialized-status panel"><span className="specialized-status-icon">{config.icon}</span><h2>{tool === "slides" ? t("Crea presentaciones de estudio") : tool === "images" ? t("Genera imágenes para tus apuntes") : `${language === "en" ? "Get started with" : language === "fr" ? "Commencez avec" : language === "de" ? "Beginne mit" : language === "zh-CN" ? "开始使用" : language === "ja" ? "開始" : language === "pt-BR" ? "Comece com" : "Empieza con"} ${t(config.title).toLocaleLowerCase(language)}`}</h2><p>{t(config.availability)}</p><span className="specialized-coming-soon">{t("En preparación")}</span></section>}
  </section>;
}
