import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

type ConversationRow = { id: string; section: string; title: string; created_at: string; updated_at: string };
type MessageRow = { conversation_id: string; role: string; content: string; created_at: string };

export async function GET() {
  if (!getSupabaseConfig()) return Response.json({ error: "Supabase no está configurado." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Inicia sesión para exportar tus datos." }, { status: 401 });

  const [profileResult, preferencesResult, planResult] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,created_at,updated_at").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("preferences,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_plans").select("plan,billing_period,payment_status,period_ends_at,updated_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileResult.error || preferencesResult.error || planResult.error) return Response.json({ error: "No se pudieron exportar todos los datos de la cuenta." }, { status: 500 });

  const conversations: ConversationRow[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from("conversations").select("id,section,title,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: true }).range(start, start + 999);
    if (error) return Response.json({ error: "No se pudo exportar el historial de conversaciones." }, { status: 500 });
    conversations.push(...(data as ConversationRow[]));
    if (!data || data.length < 1000) break;
  }

  const messages: MessageRow[] = [];
  for (let start = 0; start < conversations.length; start += 100) {
    const ids = conversations.slice(start, start + 100).map(item => item.id);
    for (let page = 0; ; page += 1) {
      const { data, error } = await supabase.from("messages").select("conversation_id,role,content,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).range(page * 1000, page * 1000 + 999);
      if (error) return Response.json({ error: "No se pudo exportar el historial de mensajes." }, { status: 500 });
      messages.push(...(data as MessageRow[]));
      if (!data || data.length < 1000) break;
    }
  }

  const groupedMessages = new Map<string, MessageRow[]>();
  for (const message of messages) groupedMessages.set(message.conversation_id, [...(groupedMessages.get(message.conversation_id) || []), message]);
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, emailVerifiedAt: user.email_confirmed_at, createdAt: user.created_at },
    profile: profileResult.data,
    preferences: preferencesResult.data,
    currentPlan: planResult.data,
    conversations: conversations.map(conversation => ({ ...conversation, messages: groupedMessages.get(conversation.id) || [] })),
    note: "La aplicación no guarda actualmente un historial de pagos ni contadores de consumo de IA o almacenamiento.",
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="study-ai-datos-personales.json"',
      "cache-control": "private, no-store",
    },
  });
}
