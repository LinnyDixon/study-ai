import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import type { PresentationProject, PresentationSlide } from "@/lib/presentations";

const palette = {
  minimal: { background: "FFFFFF", surface: "FFF7F7", accent: "B42336", ink: "20191A", muted: "705D60" },
  editorial: { background: "FAF6F0", surface: "F1E8DC", accent: "A03A31", ink: "2C211E", muted: "715C54" },
  bold: { background: "171719", surface: "2A2527", accent: "E5485D", ink: "FFFFFF", muted: "E0C8CB" },
  classroom: { background: "F4F7FB", surface: "E7EDF5", accent: "B42336", ink: "1D2939", muted: "526174" },
} as const;

function cleanName(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").slice(0, 90) || "study-ai-presentation";
}
function rgb(hex: string): [number, number, number] {
  const value = hex.replace(/^#/, "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}
function pdfColor(doc: jsPDF, method: "setTextColor" | "setFillColor" | "setDrawColor", hex: string) {
  const [r, g, b] = rgb(hex);
  doc[method](r, g, b);
}

function addPptxSlide(pptx: PptxGenJS, project: PresentationProject, item: PresentationSlide, index: number, includeSources = false) {
  const colors = palette[project.style];
  const slide = pptx.addSlide();
  slide.background = { color: item.kind === "title" || item.kind === "conclusion" && project.style === "bold" ? "211719" : colors.background };
  const darkHero = item.kind === "title" || (item.kind === "conclusion" && project.style === "bold");
  const ink = darkHero ? "FFFFFF" : colors.ink;
  const muted = darkHero ? "E8DADD" : colors.muted;
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.17, h: 7.5, line: { color: colors.accent, transparency: 100 }, fill: { color: colors.accent } });

  if (item.kind === "title") {
    slide.addShape(pptx.ShapeType.rect, { x: 9.35, y: -0.4, w: 4.2, h: 8.4, rotate: 18, line: { color: colors.accent, transparency: 100 }, fill: { color: colors.accent, transparency: 3 } });
    slide.addText(project.title, { x: 0.85, y: 1.48, w: 8.3, h: 1.65, fontFace: "Aptos Display", fontSize: 34, bold: true, color: ink, breakLine: false, valign: "middle", fit: "shrink" });
    slide.addText(item.subtitle || project.goal, { x: 0.9, y: 3.35, w: 7.8, h: 0.85, fontSize: 18, color: muted, breakLine: false, fit: "shrink" });
    slide.addShape(pptx.ShapeType.line, { x: 0.9, y: 4.55, w: 1.3, h: 0, line: { color: colors.accent, width: 3 } });
    if (item.body) slide.addText(item.body, { x: 0.9, y: 4.8, w: 7.5, h: 0.9, fontSize: 13, color: muted, fit: "shrink" });
  } else {
    slide.addText(item.title, { x: 0.78, y: 0.55, w: 11.7, h: 0.8, fontFace: "Aptos Display", fontSize: 27, bold: true, color: ink, fit: "shrink", valign: "middle" });
    slide.addShape(pptx.ShapeType.line, { x: 0.82, y: 1.47, w: 1.1, h: 0, line: { color: colors.accent, width: 2.2 } });
    if (item.subtitle) slide.addText(item.subtitle, { x: 0.85, y: 1.68, w: 11.25, h: 0.5, fontSize: 14, color: muted, fit: "shrink" });

    const bulletTop = item.subtitle ? 2.35 : 1.95;
    const hasVisualColumn = Boolean(item.visualIdea || item.imageData) && item.kind !== "quote";
    const textWidth = hasVisualColumn ? 6.0 : 11.0;
    if (item.body) slide.addText(item.body, { x: 0.88, y: bulletTop, w: textWidth, h: 1.0, fontSize: 16, color: ink, breakLine: false, valign: "middle", fit: "shrink" });
    const bulletStart = bulletTop + (item.body ? 1.13 : 0.12);
    const bulletSpace = Math.min(0.78, 3.65 / Math.max(item.bullets.length, 1));
    item.bullets.slice(0, 6).forEach((bullet, bulletIndex) => {
      slide.addShape(pptx.ShapeType.ellipse, { x: 0.92, y: bulletStart + bulletIndex * bulletSpace + 0.1, w: 0.1, h: 0.1, line: { color: colors.accent, transparency: 100 }, fill: { color: colors.accent } });
      slide.addText(bullet, { x: 1.18, y: bulletStart + bulletIndex * bulletSpace, w: textWidth - 0.3, h: Math.max(0.42, bulletSpace - 0.06), fontSize: 15, color: ink, breakLine: false, valign: "middle", fit: "shrink" });
    });
    if (hasVisualColumn) {
      slide.addShape(pptx.ShapeType.roundRect, { x: 7.55, y: 2.1, w: 4.65, h: 3.6, rectRadius: 0.12, line: { color: colors.accent, transparency: 72, width: 1 }, fill: { color: colors.surface } });
      if (item.imageData) slide.addImage({ data: item.imageData, x: 7.73, y: 2.28, w: 4.28, h: 2.55, transparency: 0 });
      else {
        slide.addShape(pptx.ShapeType.ellipse, { x: 9.0, y: 2.75, w: 1.55, h: 1.55, line: { color: colors.accent, transparency: 100 }, fill: { color: colors.accent, transparency: 8 } });
        slide.addShape(pptx.ShapeType.rect, { x: 8.05, y: 4.55, w: 3.62, h: 0.08, line: { color: colors.accent, transparency: 100 }, fill: { color: colors.accent } });
        slide.addText("✦", { x: 9.55, y: 3.1, w: 0.45, h: 0.55, fontSize: 28, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
      }
      slide.addText(item.visualIdea, { x: 7.75, y: item.imageData ? 4.95 : 4.85, w: 4.2, h: 0.62, fontSize: 10, italic: true, color: muted, fit: "shrink", valign: "middle" });
    }
    if (item.kind === "quote" && item.body) slide.addText(`“${item.body}”`, { x: 1.05, y: 2.35, w: 10.7, h: 1.65, fontSize: 25, bold: true, italic: true, color: colors.accent, align: "center", valign: "middle", fit: "shrink" });
    if (item.kind === "conclusion" && project.citations.length) {
      slide.addText("Sources", { x: 0.9, y: 6.05, w: 1.3, h: 0.25, fontSize: 9, bold: true, color: muted });
      slide.addText(project.citations.join("\n"), { x: 0.9, y: 6.28, w: 11.3, h: 0.65, fontSize: 8, color: muted, fit: "shrink" });
    }
  }
  slide.addText(`${String(index + 1).padStart(2, "0")}  ·  ${cleanName(project.title)}`, { x: 0.85, y: 7.15, w: 11.5, h: 0.18, fontSize: 7, color: muted, margin: 0 });
  if (includeSources && project.citations.length) slide.addNotes(`Sources:\n${project.citations.join("\n")}`);
  return slide;
}

export function buildPptx(project: PresentationProject) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "STUDY AI";
  pptx.subject = project.goal;
  pptx.title = project.title;
  pptx.company = "STUDY AI";
  project.slides.forEach((slide, index) => addPptxSlide(pptx, project, slide, index, index === project.slides.length - 1));
  return pptx;
}

export async function downloadPptx(project: PresentationProject) {
  const pptx = buildPptx(project);
  await pptx.writeFile({ fileName: `${cleanName(project.title)}.pptx` });
}

function addPdfSlide(doc: jsPDF, project: PresentationProject, slide: PresentationSlide, index: number) {
  const colors = palette[project.style];
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const darkHero = slide.kind === "title" || (slide.kind === "conclusion" && project.style === "bold");
  const ink = darkHero ? "FFFFFF" : colors.ink;
  const muted = darkHero ? "E8DADD" : colors.muted;
  pdfColor(doc, "setFillColor", darkHero ? "211719" : colors.background);
  doc.rect(0, 0, width, height, "F");
  pdfColor(doc, "setFillColor", colors.accent);
  doc.rect(0, 0, 10, height, "F");
  if (slide.kind === "title") {
    pdfColor(doc, "setTextColor", ink); doc.setFont("helvetica", "bold"); doc.setFontSize(34);
    doc.text(doc.splitTextToSize(project.title, width * .65), 65, 165);
    doc.setFont("helvetica", "normal"); doc.setFontSize(18); pdfColor(doc, "setTextColor", muted);
    doc.text(doc.splitTextToSize(slide.subtitle || project.goal, width * .62), 68, 250);
    pdfColor(doc, "setDrawColor", colors.accent); doc.setLineWidth(3); doc.line(68, 315, 165, 315);
  } else {
    pdfColor(doc, "setTextColor", ink); doc.setFont("helvetica", "bold"); doc.setFontSize(27);
    doc.text(doc.splitTextToSize(slide.title, width - 120), 58, 65);
    pdfColor(doc, "setDrawColor", colors.accent); doc.setLineWidth(2); doc.line(60, 89, 125, 89);
    let y = 123;
    if (slide.subtitle) { doc.setFont("helvetica", "normal"); doc.setFontSize(13); pdfColor(doc, "setTextColor", muted); doc.text(doc.splitTextToSize(slide.subtitle, width - 150), 65, y); y += 35; }
    if (slide.body) { pdfColor(doc, "setTextColor", ink); doc.setFont("helvetica", slide.kind === "quote" ? "italic" : "normal"); doc.setFontSize(slide.kind === "quote" ? 23 : 16); const bodyLines = doc.splitTextToSize(slide.body, width * (slide.visualIdea || slide.imageData ? .48 : .8)); doc.text(bodyLines, 65, y); y += bodyLines.length * 22 + 13; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(15); pdfColor(doc, "setTextColor", ink);
    const bulletWidth = slide.visualIdea || slide.imageData ? width * .45 : width - 130;
    for (const bullet of slide.bullets.slice(0, 6)) {
      pdfColor(doc, "setFillColor", colors.accent); doc.circle(72, y - 4, 3, "F");
      const lines = doc.splitTextToSize(bullet, bulletWidth - 25);
      doc.text(lines, 90, y); y += Math.max(lines.length * 19, 28);
    }
    if (slide.visualIdea || slide.imageData) {
      const x = width * .58; const boxY = 145; const boxW = width * .34; const boxH = 245;
      pdfColor(doc, "setFillColor", colors.surface); pdfColor(doc, "setDrawColor", colors.accent); doc.roundedRect(x, boxY, boxW, boxH, 12, 12, "FD");
      if (slide.imageData) {
        const fmt = slide.imageData.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(slide.imageData, fmt, x + 13, boxY + 13, boxW - 26, boxH - 54, undefined, "FAST");
      } else {
        pdfColor(doc, "setFillColor", colors.accent); doc.circle(x + boxW / 2, boxY + 95, 37, "F");
        pdfColor(doc, "setDrawColor", colors.accent); doc.setLineWidth(3); doc.line(x + 40, boxY + 165, x + boxW - 40, boxY + 165);
      }
      doc.setFont("helvetica", "italic"); doc.setFontSize(10); pdfColor(doc, "setTextColor", muted);
      doc.text(doc.splitTextToSize(slide.visualIdea, boxW - 25), x + 13, boxY + boxH - 24);
    }
    if (slide.kind === "conclusion" && project.citations.length) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); pdfColor(doc, "setTextColor", muted); doc.text("Sources", 65, height - 38);
      doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(project.citations.join(" · "), width - 130), 112, height - 38);
    }
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); pdfColor(doc, "setTextColor", muted);
  doc.text(`${String(index + 1).padStart(2, "0")}  ·  ${cleanName(project.title)}`, 62, height - 16);
}

export function buildPdf(project: PresentationProject) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540], compress: true });
  project.slides.forEach((slide, index) => { if (index) doc.addPage([960, 540], "landscape"); addPdfSlide(doc, project, slide, index); });
  return doc.output("arraybuffer");
}

export function downloadPdf(project: PresentationProject) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540], compress: true });
  project.slides.forEach((slide, index) => { if (index) doc.addPage([960, 540], "landscape"); addPdfSlide(doc, project, slide, index); });
  doc.save(`${cleanName(project.title)}.pdf`);
}
