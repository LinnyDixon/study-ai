import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { getPlanName, type PlanTier } from "@/lib/plans";

export async function authorizePremiumStudyTool(tool: "Matemática" | "Física" | "Química" | "IA Libre" | "Creador de presentaciones") {
  if (!getSupabaseConfig()) return { ok: false as const, status: 503, error: "La autenticación de STUDY AI todavía no está configurada." };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { ok: false as const, status: 401, error: `Inicia sesión para usar ${tool}.` };
    const { data: plan, error } = await supabase.from("user_plans").select("plan,payment_status,period_ends_at").eq("user_id", user.id).maybeSingle();
    if (error) return { ok: false as const, status: 503, error: "No se pudo comprobar tu plan. Intenta de nuevo más tarde." };
    const name = plan ? getPlanName(plan.plan as PlanTier, plan.payment_status, plan.period_ends_at) : "Gratis";
    const available = name === "Study Pro" || ((tool === "IA Libre" || tool === "Creador de presentaciones") && name === "L.D.") || (tool !== "Creador de presentaciones" && tool !== "IA Libre" && name === "Study Plus");
    if (!available) {
      const plans = tool === "Creador de presentaciones" ? "Study Pro o L.D." : tool === "IA Libre" ? "Study Plus, Study Pro o L.D." : "Study Plus o Study Pro";
      return { ok: false as const, status: 403, error: `${tool} requiere ${plans}. Consulta los planes para ver las opciones disponibles.` };
    }
    return { ok: true as const, userId: user.id, plan: name };
  } catch {
    return { ok: false as const, status: 503, error: "No se pudo validar el acceso. Comprueba la configuración de Supabase." };
  }
}
