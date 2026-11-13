import { createClient } from "@/lib/supabase/server";
import { authorizePremiumStudyTool } from "@/lib/study-access";
import { extractText, getDocumentProxy } from "unpdf";

export const maxDuration = 30;
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_PDF_PAGES = 30;
const MAX_EXTRACTED_CHARS = 60_000;

export async function POST(request: Request) {
  const access = await authorizePremiumStudyTool("Creador de presentaciones");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return Response.json({ error: "Inicia sesión para procesar una fuente." }, { status: 401 });
  } catch { return Response.json({ error: "La autenticación no está disponible." }, { status: 503 }); }

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "No se pudo leer el archivo enviado." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size < 5 || file.size > MAX_PDF_BYTES) {
    return Response.json({ error: "Elige un PDF válido de hasta 12 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return Response.json({ error: "El archivo no parece ser un PDF válido." }, { status: 400 });
  try {
    const document = await getDocumentProxy(bytes);
    if (document.numPages > MAX_PDF_PAGES) return Response.json({ error: `El PDF tiene ${document.numPages} páginas; el límite es ${MAX_PDF_PAGES}.` }, { status: 413 });
    const { text } = await extractText(document, { mergePages: true });
    const extracted = (Array.isArray(text) ? text.join("\n") : text).replace(/\0/g, "").trim().slice(0, MAX_EXTRACTED_CHARS);
    if (!extracted) return Response.json({ error: "No se encontró texto seleccionable en el PDF. Los documentos escaneados requieren OCR y no se procesaron." }, { status: 422 });
    return Response.json({ text: extracted, pages: document.numPages, filename: file.name });
  } catch {
    return Response.json({ error: "No se pudo extraer el texto del PDF. Comprueba que el archivo no esté dañado ni cifrado." }, { status: 422 });
  }
}
