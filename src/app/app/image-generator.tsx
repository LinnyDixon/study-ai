"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { AppLanguage } from "@/lib/app-languages";
import { translateUi } from "@/lib/ui-translation";
import "./image-generator.css";

type Orientation = "square" | "landscape" | "portrait";
type Style = "realistic" | "anime" | "illustration" | "watercolor" | "minimalist" | "educational" | "artistic";
type Quality = "low" | "medium" | "high";
type Quota = { images_used: number; daily_limit: number; images_remaining: number };
type ImageRecord = { id: string; prompt: string; style: Style; orientation: Orientation; quality: Quality; created_at: string; imageUrl: string | null };
type Tab = "create" | "library" | "history";

const styles: { id: Style; label: string }[] = [
  { id: "realistic", label: "Realista" }, { id: "anime", label: "Anime" }, { id: "illustration", label: "Ilustración" },
  { id: "watercolor", label: "Acuarela" }, { id: "minimalist", label: "Minimalista" }, { id: "educational", label: "Educativo" }, { id: "artistic", label: "Artístico" },
];
const ratios: Record<Orientation, string> = { square: "1:1", landscape: "3:2", portrait: "2:3" };
const styleText: Record<Style, string> = Object.fromEntries(styles.map((item) => [item.id, item.label])) as Record<Style, string>;
const orientationText: Record<Orientation, string> = { square: "Cuadrada", landscape: "Horizontal", portrait: "Vertical" };
const qualityText: Record<Quality, string> = { low: "Rápida", medium: "Estándar", high: "Alta" };

function readApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return fallback;
}

export function ImageGenerator({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const t = (text: string) => translateUi(language, text);
  const [tab, setTab] = useState<Tab>("create");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<Style>("realistic");
  const [orientation, setOrientation] = useState<Orientation>("square");
  const [quality, setQuality] = useState<Quality>("medium");
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [currentImage, setCurrentImage] = useState<ImageRecord | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadImages = useCallback(async () => {
    try {
      const response = await fetch("/api/images", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(readApiError(payload, "No se pudieron cargar tus imágenes."));
      setImages(payload.images || []);
      setQuota(payload.quota || null);
      setProviderConfigured(payload.providerConfigured === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus imágenes.");
    } finally { setLoadingLibrary(false); }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void loadImages(); });
    return () => window.cancelAnimationFrame(frame);
  }, [loadImages]);

  async function generate(nextPrompt = prompt, options = { style, orientation, quality }) {
    setGenerating(true); setError(""); setNotice(""); setCurrentImage(null);
    try {
      const response = await fetch("/api/images/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nextPrompt, ...options }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.error?.quota) setQuota(payload.error.quota);
        throw new Error(readApiError(payload, "No se pudo generar la imagen."));
      }
      const result: ImageRecord = { ...payload.image, imageUrl: payload.imageUrl || null };
      setCurrentImage(result);
      setQuota(payload.quota || null);
      setPrompt(nextPrompt);
      setNotice(t("La imagen se guardó automáticamente en tu cuenta."));
      await loadImages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar la imagen.");
    } finally { setGenerating(false); }
  }

  async function downloadImage(id: string) {
    setWorkingId(id); setError("");
    try {
      const response = await fetch(`/api/images/download?id=${encodeURIComponent(id)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(readApiError(payload, "No se pudo descargar la imagen."));
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl; link.download = `study-ai-${id}.webp`; link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo descargar la imagen."); }
    finally { setWorkingId(""); }
  }

  async function deleteImage(id: string) {
    if (!window.confirm(t("¿Eliminar esta imagen de tu cuenta?"))) return;
    setWorkingId(id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo eliminar la imagen."));
      setImages((current) => current.filter((image) => image.id !== id));
      if (currentImage?.id === id) setCurrentImage(null);
      setNotice(t("Imagen eliminada de tu cuenta."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la imagen."); }
    finally { setWorkingId(""); }
  }

  function chooseOrientation(next: Orientation) {
    setOrientation(next);
  }

  return <section className="tool-view specialized-page image-generator-page">
    <button className="specialized-back" type="button" onClick={onBack}>← {t("Volver a Herramientas especializadas")}</button>
    <div className="specialized-title-row"><span className="specialized-title-icon" aria-hidden="true">▧</span><div><div className="eyebrow">STUDY AI · {t("HERRAMIENTAS ESPECIALIZADAS")}</div><h1>{t("Generador de imágenes")}</h1></div></div>
    <p className="tool-intro">{t("Describe una imagen y crea un recurso visual para tus estudios.")}</p>
    <nav className="specialized-tabs image-generator-tabs" aria-label={t("Secciones del Generador de imágenes")}>
      {([ ["create", "Crear imagen"], ["library", "Mis imágenes"], ["history", "Historial"] ] as [Tab, string][]).map(([id, label]) =>
        <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setError(""); }}>{t(label)}</button>) }
    </nav>

    {providerConfigured === false && <div className="image-generator-banner" role="status"><strong>{t("Falta activar el servicio de generación")}</strong><span>{t("Para generar imágenes reales, agrega OPENAI_API_KEY como variable secreta del servidor y reinicia o redespliega la aplicación. La clave no se pone en NEXT_PUBLIC_* ni en el navegador.")}</span></div>}
    {error && <div className="image-generator-message is-error" role="alert">{error}</div>}
    {notice && <div className="image-generator-message is-success" role="status">{notice}</div>}

    {tab === "create" ? <section className="image-create-layout">
      <form className="image-create-form panel" onSubmit={(event) => { event.preventDefault(); void generate(); }}>
        <div className="image-form-heading"><span>✦</span><div><h2>{t("¿Qué imagen quieres crear?")}</h2><p>{t("Sé descriptivo: menciona el tema, los detalles y el ambiente.")}</p></div></div>
        <label className="image-field-label" htmlFor="image-prompt">{t("Descripción")}</label>
        <textarea id="image-prompt" className="image-prompt-input" value={prompt} maxLength={1200} onChange={(event) => setPrompt(event.target.value)} placeholder={t("Ejemplo: una célula vegetal explicada con etiquetas claras, estilo ilustración educativa, fondo claro...")} required minLength={3} />
        <div className="image-prompt-footer"><span>{prompt.length}/1200</span><span>{t("La imagen se guardará en tu cuenta")}</span></div>
        <div className="image-option-grid">
          <label className="image-field-label">{t("Estilo")}
            <select value={style} onChange={(event) => setStyle(event.target.value as Style)}>{styles.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select>
          </label>
          <label className="image-field-label">{t("Proporción")}
            <select value={ratios[orientation]} onChange={(event) => setOrientation(event.target.value === "1:1" ? "square" : event.target.value === "3:2" ? "landscape" : "portrait")}>
              <option value="1:1">1:1 · {t("Cuadrada")}</option><option value="3:2">3:2 · {t("Horizontal")}</option><option value="2:3">2:3 · {t("Vertical")}</option>
            </select>
          </label>
          <label className="image-field-label">{t("Orientación")}
            <select value={orientation} onChange={(event) => chooseOrientation(event.target.value as Orientation)}><option value="square">{t("Cuadrada")}</option><option value="landscape">{t("Horizontal")}</option><option value="portrait">{t("Vertical")}</option></select>
          </label>
          <label className="image-field-label">{t("Calidad")}
            <select value={quality} onChange={(event) => setQuality(event.target.value as Quality)}><option value="low">{t("Rápida")}</option><option value="medium">{t("Estándar")}</option><option value="high">{t("Alta")}</option></select>
          </label>
        </div>
        {quota && <div className="image-quota"><span>{t("Imágenes de hoy")}</span><strong>{quota.images_used} / {quota.daily_limit >= 2147483647 ? "∞" : quota.daily_limit}</strong>{quota.daily_limit < 2147483647 && <small>{t("disponibles")}: {quota.images_remaining}</small>}</div>}
        <button className="primary-button image-generate-button" type="submit" disabled={generating || prompt.trim().length < 3 || providerConfigured === false || quota?.images_remaining === 0}>
          {generating ? <><span className="image-spinner" aria-hidden="true"/> {t("Generando imagen…")}</> : <>✦ {t("Generar imagen")}</>}
        </button>
        <p className="image-cost-note">{t("La generación usa el límite diario de imágenes de tu plan.")}</p>
      </form>

      <div className="image-preview-panel panel" aria-live="polite">
        {generating ? <div className="image-generating-state"><span className="image-large-spinner"/><h2>{t("Creando tu imagen")}</h2><p>{t("Puede tardar un momento. No cierres esta página.")}</p></div>
          : currentImage?.imageUrl ? <><Image className="image-result" src={currentImage.imageUrl} alt={currentImage.prompt} width={1024} height={1024} unoptimized /><div className="image-result-caption"><p>{currentImage.prompt}</p><div><button type="button" className="image-action-button" disabled={workingId === currentImage.id} onClick={() => void downloadImage(currentImage.id)}>↓ {t("Descargar")}</button><button type="button" className="image-action-button" onClick={() => void generate(currentImage.prompt)}>↻ {t("Volver a generar")}</button></div></div></>
          : <div className="image-empty-preview"><span>✧</span><h2>{t("Tu próxima idea")}</h2><p>{t("Cuando generes una imagen real, aparecerá aquí y se guardará en Mis imágenes.")}</p></div>}
      </div>
    </section> : tab === "library" ? <section className="image-library-section">
      <div className="image-library-heading"><div><h2>{t("Mis imágenes")}</h2><p>{t("Tus imágenes generadas se guardan de forma privada en tu cuenta.")}</p></div><button type="button" className="image-refresh-button" onClick={() => { setLoadingLibrary(true); void loadImages(); }} disabled={loadingLibrary}>{t("Actualizar")}</button></div>
      {loadingLibrary ? <div className="image-list-message panel">{t("Cargando tus imágenes…")}</div> : images.length === 0 ? <div className="image-list-message panel"><span>▱</span><h3>{t("Todavía no hay imágenes")}</h3><p>{t("Crea tu primera imagen para verla aquí.")}</p><button type="button" className="image-action-button" onClick={() => setTab("create")}>{t("Crear imagen")}</button></div> : <div className="image-gallery">{images.map((image) => <ImageCard key={image.id} image={image} language={language} busy={workingId === image.id} onDownload={() => void downloadImage(image.id)} onDelete={() => void deleteImage(image.id)} onRegenerate={() => { setPrompt(image.prompt); setStyle(image.style); setOrientation(image.orientation); setQuality(image.quality); setTab("create"); void generate(image.prompt, { style: image.style, orientation: image.orientation, quality: image.quality }); }}/>)}</div>}
    </section> : <section className="image-history-section">
      <div className="image-library-heading"><div><h2>{t("Historial")}</h2><p>{t("Registro de las imágenes que generaste, de la más reciente a la más antigua.")}</p></div><button type="button" className="image-refresh-button" onClick={() => { setLoadingLibrary(true); void loadImages(); }} disabled={loadingLibrary}>{t("Actualizar")}</button></div>
      {loadingLibrary ? <div className="image-list-message panel">{t("Cargando historial…")}</div> : images.length === 0 ? <div className="image-list-message panel"><span>◷</span><h3>{t("El historial está vacío")}</h3><p>{t("Las generaciones completadas aparecerán aquí.")}</p></div> : <div className="image-history-list">{images.map((image) => <article className="image-history-row panel" key={image.id}>
        {image.imageUrl ? <Image src={image.imageUrl} alt="" width={72} height={72} unoptimized/> : <span className="image-history-placeholder">▧</span>}
        <div className="image-history-copy"><time dateTime={image.created_at}>{new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(image.created_at))}</time><p>{image.prompt}</p><small>{t(styleText[image.style])} · {t(orientationText[image.orientation])} · {t(qualityText[image.quality])}</small></div>
        <button type="button" className="image-action-button" disabled={!image.imageUrl || workingId === image.id} onClick={() => void downloadImage(image.id)}>{t("Descargar")}</button>
      </article>)}</div>}
    </section>}
  </section>;
}

function ImageCard({ image, language, busy, onDownload, onDelete, onRegenerate }: { image: ImageRecord; language: AppLanguage; busy: boolean; onDownload: () => void; onDelete: () => void; onRegenerate: () => void }) {
  const t = (text: string) => translateUi(language, text);
  return <article className="image-card panel">
    <div className="image-card-art">{image.imageUrl ? <Image src={image.imageUrl} alt={image.prompt} width={512} height={512} unoptimized/> : <span>{t("Vista previa no disponible")}</span>}</div>
    <div className="image-card-content"><p>{image.prompt}</p><small>{t(styleText[image.style])} · {t(orientationText[image.orientation])} · {t(qualityText[image.quality])}</small><time dateTime={image.created_at}>{new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(image.created_at))}</time>
      <div className="image-card-actions"><button type="button" disabled={!image.imageUrl || busy} onClick={onDownload}>{t("Descargar")}</button><button type="button" disabled={busy} onClick={onRegenerate}>{t("Regenerar")}</button><button type="button" className="image-delete-action" disabled={busy} onClick={onDelete}>{t("Eliminar")}</button></div>
    </div>
  </article>;
}
