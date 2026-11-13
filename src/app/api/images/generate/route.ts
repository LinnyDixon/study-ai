import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 180;

const styles = {
  realistic: "realistic photography, natural lighting and believable materials",
  anime: "anime illustration with expressive characters and polished cel shading",
  illustration: "clear, detailed editorial illustration",
  watercolor: "traditional watercolor painting with soft pigment and paper texture",
  minimalist: "minimalist composition with clean forms and restrained colors",
  educational: "accurate, clear educational illustration suitable for study materials",
  artistic: "expressive fine-art composition with intentional color and texture",
} as const;

type Style = keyof typeof styles;
type Orientation = "square" | "landscape" | "portrait";
type Quality = "low" | "medium" | "high";

function failure(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return failure(503, "provider_not_configured", "La generación real todavía no está activada. Falta configurar OPENAI_API_KEY en el servidor.");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return failure(401, "unauthorized", "Inicia sesión para generar y guardar imágenes.");

  let body: { prompt?: unknown; style?: unknown; orientation?: unknown; quality?: unknown };
  try { body = await request.json(); }
  catch { return failure(400, "invalid_request", "La solicitud no tiene un formato válido."); }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const style = body.style as Style;
  const orientation = body.orientation as Orientation;
  const quality = body.quality as Quality;
  if (prompt.length < 3 || prompt.length > 1200) return failure(400, "invalid_prompt", "Escribe una descripción de entre 3 y 1200 caracteres.");
  if (!(style in styles)) return failure(400, "invalid_style", "Elige uno de los estilos disponibles.");
  if (!["square", "landscape", "portrait"].includes(orientation)) return failure(400, "invalid_orientation", "Elige una orientación válida.");
  if (!["low", "medium", "high"].includes(quality)) return failure(400, "invalid_quality", "Elige una calidad válida.");

  const { data: reservation, error: quotaError } = await supabase.rpc("reserve_image_generation").maybeSingle();
  if (quotaError) {
    if (quotaError.code === "P0001") {
      const { data: quota } = await supabase.rpc("image_generation_quota").maybeSingle();
      return Response.json({ error: { code: "daily_limit", message: "Alcanzaste el límite diario de imágenes de tu plan.", quota } }, { status: 429 });
    }
    if (["42883", "42P01", "PGRST202"].includes(quotaError.code || "")) {
      return failure(503, "migration_required", "Falta aplicar la migración supabase/migrations/202611130004_image_generator.sql en Supabase.");
    }
    return failure(503, "quota_unavailable", "No se pudo comprobar el límite diario. Inténtalo de nuevo más tarde.");
  }

  let uploadedPath: string | null = null;
  try {
    const size = orientation === "square" ? "1024x1024" : orientation === "landscape" ? "1536x1024" : "1024x1536";
    const composedPrompt = `${prompt}\n\nVisual style: ${styles[style]}. Composition: ${orientation}.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 170_000);
    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", prompt: composedPrompt, size, quality, output_format: "webp", n: 1 }),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally { clearTimeout(timeout); }

    if (!providerResponse.ok) {
      await supabase.rpc("release_image_generation");
      if (providerResponse.status === 429) return failure(503, "provider_busy", "El servicio de imágenes está ocupado o alcanzó su cuota. Inténtalo más tarde.");
      if (providerResponse.status === 401 || providerResponse.status === 403) return failure(503, "provider_credentials", "El servidor de imágenes rechazó sus credenciales. Revisa OPENAI_API_KEY en el servidor.");
      return failure(502, "provider_error", "El servicio no pudo generar esta imagen. Revisa la descripción e inténtalo de nuevo.");
    }

    const result = await providerResponse.json() as { data?: Array<{ b64_json?: string }> };
    const encodedImage = result.data?.[0]?.b64_json;
    if (!encodedImage) {
      await supabase.rpc("release_image_generation");
      return failure(502, "empty_result", "El servicio no devolvió una imagen. No se guardó ningún resultado.");
    }

    const imageBytes = Buffer.from(encodedImage, "base64");
    if (imageBytes.length === 0 || imageBytes.length > 20 * 1024 * 1024) {
      await supabase.rpc("release_image_generation");
      return failure(502, "invalid_result", "El servicio devolvió una imagen vacía o demasiado grande.");
    }

    const id = randomUUID();
    uploadedPath = `${user.id}/${id}.webp`;
    const { error: uploadError } = await supabase.storage.from("study-generated-images").upload(uploadedPath, imageBytes, {
      contentType: "image/webp", cacheControl: "31536000", upsert: false,
    });
    if (uploadError) {
      await supabase.rpc("release_image_generation");
      if (/bucket not found/i.test(uploadError.message)) return failure(503, "migration_required", "Falta aplicar la migración supabase/migrations/202611130004_image_generator.sql en Supabase.");
      return failure(503, "storage_error", "La imagen se generó, pero no se pudo guardar de forma privada en tu cuenta.");
    }

    const { data: image, error: saveError } = await supabase.from("user_generated_images").insert({
      id, user_id: user.id, storage_path: uploadedPath, prompt, style, orientation, quality,
    }).select("id,prompt,style,orientation,quality,created_at,storage_path").single();
    if (saveError || !image) {
      await supabase.storage.from("study-generated-images").remove([uploadedPath]);
      await supabase.rpc("release_image_generation");
      if (["42P01", "PGRST205"].includes(saveError?.code || "")) return failure(503, "migration_required", "Falta aplicar la migración supabase/migrations/202611130004_image_generator.sql en Supabase.");
      return failure(503, "save_error", "La imagen se generó, pero no se pudo registrar en tu biblioteca.");
    }

    const { data: signed, error: signedError } = await supabase.storage.from("study-generated-images").createSignedUrl(uploadedPath, 3600);
    if (signedError || !signed) return Response.json({ image, quota: reservation, imageUrl: null, warning: "image_saved_url_unavailable" });
    return Response.json({ image, quota: reservation, imageUrl: signed.signedUrl });
  } catch (cause) {
    if (uploadedPath) await supabase.storage.from("study-generated-images").remove([uploadedPath]);
    await supabase.rpc("release_image_generation");
    if (cause instanceof Error && cause.name === "AbortError") return failure(504, "provider_timeout", "La generación tardó demasiado. Inténtalo nuevamente.");
    return failure(502, "generation_error", "No se pudo completar la generación. Inténtalo de nuevo.");
  }
}
