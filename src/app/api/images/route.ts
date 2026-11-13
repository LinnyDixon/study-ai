import { createClient } from "@/lib/supabase/server";

function migrationError() {
  return Response.json({ error: { code: "migration_required", message: "Falta aplicar la migración supabase/migrations/202611130004_image_generator.sql en Supabase." } }, { status: 503 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: { code: "unauthorized", message: "Inicia sesión para ver tus imágenes." } }, { status: 401 });

  const [{ data: records, error: listError }, { data: quota, error: quotaError }] = await Promise.all([
    supabase.from("user_generated_images").select("id,prompt,style,orientation,quality,created_at,storage_path").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.rpc("image_generation_quota").maybeSingle(),
  ]);
  if (listError || quotaError) {
    const code = listError?.code || quotaError?.code || "";
    if (["42P01", "42883", "PGRST202", "PGRST205"].includes(code)) return migrationError();
    return Response.json({ error: { code: "history_unavailable", message: "No se pudieron cargar tus imágenes." } }, { status: 503 });
  }

  const images = await Promise.all((records || []).map(async (image) => {
    const { data } = await supabase.storage.from("study-generated-images").createSignedUrl(image.storage_path, 3600);
    return { ...image, imageUrl: data?.signedUrl || null };
  }));
  return Response.json({ images, quota, providerConfigured: Boolean(process.env.OPENAI_API_KEY) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: { code: "unauthorized", message: "Inicia sesión para eliminar imágenes." } }, { status: 401 });

  let body: { id?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: { code: "invalid_request", message: "La solicitud no es válida." } }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ error: { code: "invalid_id", message: "La imagen indicada no es válida." } }, { status: 400 });

  const { data: image, error: lookupError } = await supabase.from("user_generated_images").select("id,storage_path").eq("id", body.id).eq("user_id", user.id).maybeSingle();
  if (lookupError) {
    if (["42P01", "PGRST205"].includes(lookupError.code || "")) return migrationError();
    return Response.json({ error: { code: "lookup_failed", message: "No se pudo encontrar la imagen." } }, { status: 503 });
  }
  if (!image) return Response.json({ error: { code: "not_found", message: "La imagen ya no existe." } }, { status: 404 });

  const { error: deleteError } = await supabase.from("user_generated_images").delete().eq("id", image.id).eq("user_id", user.id);
  if (deleteError) return Response.json({ error: { code: "delete_failed", message: "No se pudo eliminar la imagen de tu biblioteca." } }, { status: 503 });
  const { error: storageError } = await supabase.storage.from("study-generated-images").remove([image.storage_path]);
  if (storageError) return Response.json({ warning: "record_deleted_file_cleanup_pending" });
  return Response.json({ deleted: true });
}
