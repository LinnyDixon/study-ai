import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Inicia sesión para descargar imágenes." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "La imagen indicada no es válida." }, { status: 400 });
  const { data: image, error } = await supabase.from("user_generated_images").select("id,storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error || !image) return Response.json({ error: "No se encontró esa imagen en tu cuenta." }, { status: error ? 503 : 404 });

  const { data: file, error: downloadError } = await supabase.storage.from("study-generated-images").download(image.storage_path);
  if (downloadError || !file) return Response.json({ error: "No se pudo descargar la imagen." }, { status: 503 });
  return new Response(file, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": `attachment; filename="study-ai-${image.id}.webp"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
