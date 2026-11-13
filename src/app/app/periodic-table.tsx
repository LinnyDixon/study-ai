"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { periodicElements } from "./periodic-elements";
import { useAppLocale } from "@/components/app-locale";
import { translateUi } from "@/lib/ui-translation";
import { createClient } from "@/lib/supabase/client";
import { saveMyPreferences } from "@/lib/supabase/preferences";

type ElementVisual = { image: string | null; fact: string | null; sourceUrl: string | null; imageSourceUrl: string | null };
const commonUses: Record<string, string> = {
  H: "Forma parte del agua y de muchas sustancias; se estudia también como vector energético.", He: "Se usa en globos y en equipos criogénicos especializados.", Li: "Se utiliza en baterías recargables.", C: "El grafito se usa en lápices y filtros; el carbono también forma parte de combustibles y materiales.", N: "Compone la mayor parte del aire; sus compuestos se usan en fertilizantes.", O: "Es esencial para la respiración y se usa en medicina y procesos industriales.", F: "Sus compuestos, como el fluoruro, se usan en productos para prevenir caries.", Ne: "Se usa en lámparas y carteles luminosos.", Na: "Sus compuestos tienen usos en alimentos, jabones y procesos químicos.", Mg: "Se encuentra en aleaciones livianas y en bengalas.", Al: "Se usa en latas, papel aluminio, transporte y construcción.", Si: "Se usa en vidrio, cerámicas y componentes electrónicos.", P: "Sus compuestos se usan en fertilizantes y detergentes.", S: "Se emplea para fabricar ácido sulfúrico y fertilizantes.", Cl: "Sus compuestos se usan para desinfectar agua y en productos de limpieza.", Ar: "Se usa en iluminación y como gas protector en soldadura.", K: "Sus compuestos se usan en fertilizantes y algunos alimentos.", Ca: "Sus compuestos forman parte del cemento y materiales de construcción.", Fe: "Se usa en acero para herramientas, vehículos y edificios.", Cu: "Se usa en cables eléctricos, tuberías y monedas.", Zn: "Se emplea en recubrimientos anticorrosivos y en algunas pilas.", Ag: "Se usa en joyería, contactos eléctricos y espejos.", Sn: "Se utiliza en soldaduras y recubrimientos de latas.", I: "Se usa en antisépticos y en sal yodada como compuesto.", Au: "Se usa en joyería y en contactos electrónicos resistentes a la corrosión.", Hg: "Tiene usos industriales limitados por su toxicidad; requiere manejo especializado.", Pb: "Se usa en baterías de plomo-ácido y blindaje; es tóxico y requiere manejo controlado.", U: "Se usa como combustible en reactores nucleares y requiere controles estrictos de seguridad.",
};

export function PeriodicTable() {
  const { language } = useAppLocale();
  const t = (text: string) => translateUi(language, text);
  const [query, setQuery] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [visual, setVisual] = useState<ElementVisual | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [guideSeen, setGuideSeen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const selected = periodicElements.find((element) => element.atomicNumber === selectedNumber) || null;
  const visibleNumbers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return null;
    return new Set(periodicElements.filter((element) => element.name.toLocaleLowerCase("es").includes(normalized) || element.symbol.toLocaleLowerCase("es").includes(normalized) || String(element.atomicNumber).includes(normalized)).map((element) => element.atomicNumber));
  }, [query]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const storageKey = `study-ai-periodic-guide:${user?.id || "guest"}`;
      let seen = localStorage.getItem(storageKey) === "true";
      if (user) {
        const { data } = await supabase.from("user_preferences").select("preferences").eq("user_id", user.id).maybeSingle();
        const preferences = data?.preferences && typeof data.preferences === "object" ? data.preferences as Record<string, unknown> : {};
        seen = preferences.periodicTableGuideSeen === true || seen;
      }
      if (active) { setGuideSeen(seen); setShowGuide(!seen); setGuideReady(true); }
    })();
    return () => { active = false; };
  }, []);

  async function continueToTable() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    localStorage.setItem(`study-ai-periodic-guide:${user?.id || "guest"}`, "true");
    if (user) await saveMyPreferences({ periodicTableGuideSeen: true });
    setGuideSeen(true);
    setShowGuide(false);
  }

  useEffect(() => {
    if (!selectedNumber) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/chemistry/elements/${selectedNumber}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(language === "en" ? "Could not load the visual information." : "No se pudo cargar la información visual.");
        return await response.json() as ElementVisual;
      })
      .then((result) => setVisual(result))
      .catch(() => { if (!controller.signal.aborted) setVisual({ image: null, fact: null, sourceUrl: null, imageSourceUrl: null }); })
      .finally(() => { if (!controller.signal.aborted) setVisualLoading(false); });
    return () => controller.abort();
  }, [selectedNumber, language]);

  const formatFact = (text: string) => text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");

  if (!guideReady) return <section className="periodic-guide-loading" aria-busy="true">{t("Cargando la tabla periódica…")}</section>;
  if (showGuide) return <section className="periodic-guide panel"><div className="periodic-guide-copy"><span className="chem-guide-eyebrow">GUÍA DE LA TABLA PERIÓDICA</span><h2>{t("Cómo leer correctamente los elementos de la tabla periódica")}</h2><p>{t("Observa las partes de la ficha de un elemento y después explora la tabla interactiva.")}</p></div><div className="periodic-guide-image"><Image src="/periodic-table-guide.png" alt={t("Guía visual para leer los elementos de la tabla periódica")} width={638} height={454} unoptimized/></div><button type="button" className="periodic-continue" onClick={() => void continueToTable()}>{t("Entendido, explorar tabla periódica")}</button></section>;

  return <section className={`periodic-layout ${selected ? "has-selection" : ""}`} aria-label={t("Tabla periódica interactiva")}>
    <div className="periodic-table-panel panel">
      <div className="periodic-toolbar">
        <label htmlFor="periodic-search">{t("Buscar elemento")}</label>
        <input id="periodic-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Nombre, símbolo o número…")}/>
        {guideSeen && <button type="button" className="periodic-help" onClick={() => setShowGuide(true)}>{t("¿Cómo leer la tabla periódica?")}</button>}
      </div>
      <div className="periodic-grid-scroll" tabIndex={0} aria-label={t("Desplázate horizontalmente para ver todos los grupos")}>
        <div className="periodic-grid">
          {periodicElements.map((element) => {
            const isVisible = !visibleNumbers || visibleNumbers.has(element.atomicNumber);
            const block = element.period > 7 ? "f" : element.group <= 2 ? "s" : element.group >= 13 ? "p" : "d";
            return <button key={element.atomicNumber} type="button" className={`periodic-element periodic-block-${block} ${selectedNumber === element.atomicNumber ? "selected" : ""} ${isVisible ? "" : "dimmed"}`} style={{ gridColumn: element.group, gridRow: element.period }} aria-label={`${element.name}, número atómico ${element.atomicNumber}, símbolo ${element.symbol}`} aria-pressed={selectedNumber === element.atomicNumber} onClick={() => { if (selectedNumber !== element.atomicNumber) { setVisual(null); setVisualLoading(true); setSelectedNumber(element.atomicNumber); } }}>
              <small>{element.atomicNumber}</small><strong>{element.symbol}</strong><span>{element.name}</span>
            </button>;
          })}
          <span className="periodic-series-label lanth-label">{t("Lantánidos")}</span>
          <span className="periodic-series-label actin-label">{t("Actínidos")}</span>
        </div>
      </div>
      {visibleNumbers?.size === 0 && <p className="periodic-hint">{t("No encontramos elementos con esa búsqueda.")}</p>}
      <p className="periodic-source-note">{t("Propiedades:")} <a href="https://pubchem.ncbi.nlm.nih.gov/periodic-table/" target="_blank" rel="noreferrer">PubChem</a></p>
    </div>

    {selected && <aside className="periodic-detail-panel panel" aria-label={`${language === "en" ? "Information about" : language === "fr" ? "Informations sur" : language === "de" ? "Informationen zu" : language === "zh-CN" ? "元素信息：" : language === "ja" ? "元素情報：" : language === "pt-BR" ? "Informações sobre" : "Información de"} ${selected.name}`} aria-live="polite">
      <button className="periodic-detail-close" type="button" onClick={() => { setSelectedNumber(null); setVisual(null); setVisualLoading(false); }} aria-label={t("Cerrar información del elemento")}>×</button>
      <div className="periodic-detail-heading"><span className="periodic-detail-symbol">{selected.symbol}</span><div><small>{language === "en" ? "ELEMENT" : language === "fr" ? "ÉLÉMENT" : language === "de" ? "ELEMENT" : language === "zh-CN" ? "元素" : language === "ja" ? "元素" : language === "pt-BR" ? "ELEMENTO" : "ELEMENTO"} {selected.atomicNumber}</small><h2>{selected.name}</h2><span>{selected.category}</span></div></div>

      <div className="periodic-specimen">
      {visualLoading && !visual ? <div className="periodic-image-placeholder" role="status">{t("Buscando imagen…")}</div> : visual?.image ? <Image className="periodic-specimen-image" src={visual.image} alt={`${language === "en" ? "Sample or representation of" : language === "fr" ? "Échantillon ou représentation de" : language === "de" ? "Muster oder Darstellung von" : language === "zh-CN" ? "样本或元素示意图：" : language === "ja" ? "標本または図：" : language === "pt-BR" ? "Amostra ou representação de" : "Muestra o representación de"} ${selected.name} (${selected.symbol})`} width={480} height={320} unoptimized/> : <div className="periodic-image-placeholder"><strong>{selected.symbol}</strong><span>{t("No hay una fotografía de muestra disponible.")}</span></div>}
        {visual?.image && <small>{language === "en" ? "Image:" : language === "fr" ? "Image :" : language === "de" ? "Bild:" : language === "zh-CN" ? "图片来源：" : language === "ja" ? "画像：" : language === "pt-BR" ? "Imagem:" : "Imagen:"} {visual.imageSourceUrl ? <a href={visual.imageSourceUrl} target="_blank" rel="noreferrer">Wikipedia · Wikimedia Commons ↗</a> : "Wikipedia · Wikimedia Commons"}</small>}
      </div>

      {visualLoading && !visual ? <p className="periodic-fact-loading">{t("Cargando datos del elemento…")}</p> : visual?.fact ? <div className="periodic-fact"><span>{t("¿Sabías que?")}</span><p>{formatFact(visual.fact)}</p>{visual.sourceUrl && <a href={visual.sourceUrl} target="_blank" rel="noreferrer">{language === "en" ? "View source" : language === "fr" ? "Voir la source" : language === "de" ? "Quelle anzeigen" : language === "zh-CN" ? "查看来源" : language === "ja" ? "出典を見る" : language === "pt-BR" ? "Ver fonte" : "Ver fuente"} ↗</a>}</div> : <div className="periodic-fact"><span>{t("¿Sabías que?")}</span><p>{selected.yearDiscovered === "Ancient" ? (language === "en" ? `${selected.name} has been known since antiquity.` : `${selected.name} se conoce desde la antigüedad.`) : selected.yearDiscovered ? (language === "en" ? `${selected.name} was discovered in ${selected.yearDiscovered}.` : `${selected.name} fue descubierto en ${selected.yearDiscovered}.`) : `${selected.name}: ${selected.category}`}</p></div>}

      <dl className="periodic-properties">
        <div><dt>{t("Número atómico")}</dt><dd>{selected.atomicNumber}</dd></div>
        <div><dt>{t("Clasificación")}</dt><dd>{selected.category || t("No disponible")}</dd></div>
        <div><dt>{t("Masa atómica")}</dt><dd>{selected.atomicWeight ? `${selected.atomicWeight} u` : t("No determinada")}</dd></div>
        <div><dt>{t("Estado habitual")}</dt><dd>{translateState(selected.standardState, language)}</dd></div>
        <div><dt>{t("Electronegatividad")}</dt><dd>{selected.electronegativity || t("No disponible")}</dd></div>
        <div><dt>{t("Energía de ionización")}</dt><dd>{selected.ionizationEnergy ? `${selected.ionizationEnergy} eV` : t("No disponible")}</dd></div>
        <div><dt>{t("Estados de oxidación")}</dt><dd>{selected.oxidationStates || t("No disponible")}</dd></div>
        <div className="electron-config"><dt>{t("Configuración electrónica")}</dt><dd>{selected.electronConfiguration || t("No disponible")}</dd></div>
        <div className="electron-config"><dt>{t("Usos cotidianos o conocidos")}</dt><dd>{commonUses[selected.symbol] || t("No se conoce un uso cotidiano extendido; este elemento tiene aplicaciones especializadas o todavía se estudia.")}</dd></div>
      </dl>
      {visual?.sourceUrl && <p className="periodic-detail-source">{t("Los datos descriptivos y la imagen pueden variar según la fuente.")}</p>}
    </aside>}
  </section>;
}

function translateState(value: string, language: string) {
  const states: Record<string, Record<string, string>> = {
    Solid: { es: "Sólido", en: "Solid", "pt-BR": "Sólido", fr: "Solide", de: "Fest", "zh-CN": "固态", ja: "固体" },
    Gas: { es: "Gas", en: "Gas", "pt-BR": "Gasoso", fr: "Gazeux", de: "Gasförmig", "zh-CN": "气态", ja: "気体" },
    Liquid: { es: "Líquido", en: "Liquid", "pt-BR": "Líquido", fr: "Liquide", de: "Flüssig", "zh-CN": "液态", ja: "液体" },
  };
  const expectedSolid = { es: "Sólido (predicho)", en: "Solid (predicted)", "pt-BR": "Sólido (previsto)", fr: "Solide (prévu)", de: "Fest (vorhergesagt)", "zh-CN": "固态（预测）", ja: "固体（予測）" };
  const expectedGas = { es: "Gas (predicho)", en: "Gas (predicted)", "pt-BR": "Gasoso (previsto)", fr: "Gazeux (prévu)", de: "Gasförmig (vorhergesagt)", "zh-CN": "气态（预测）", ja: "気体（予測）" };
  if (value === "Expected to be a Solid") return expectedSolid[language as keyof typeof expectedSolid] || expectedSolid.es;
  if (value === "Expected to be a Gas") return expectedGas[language as keyof typeof expectedGas] || expectedGas.es;
  return states[value]?.[language] || states[value]?.es || value || "—";
}
