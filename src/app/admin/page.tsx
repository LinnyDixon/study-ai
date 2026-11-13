import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { updateUserPlan } from "./actions";
import { PlanForm } from "./plan-form";
import { PlansCatalog } from "./plans-catalog";
import { AdminPayments } from "./payments";
import { getPlanName, type BillingPeriod, type PlanTier } from "@/lib/plans";

export const metadata: Metadata = { title: "Administración · STUDY AI", robots: { index: false, follow: false } };
type AdminSearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Profile = { id: string; display_name: string; created_at: string };
type DirectoryEntry = { user_id: string; email: string };
type UserPlan = { user_id: string; plan: PlanTier | "dixon"; billing_period: BillingPeriod; payment_status: "free" | "paid" | "comped" | "unpaid"; period_ends_at: string | null };

export default function AdminPage({ searchParams }: AdminSearchProps) {
  return <Suspense fallback={<main className="admin-page"><section className="admin-setup" aria-label="Cargando administración"/></main>}><AdminContent searchParams={searchParams}/></Suspense>;
}

async function AdminContent({ searchParams }: AdminSearchProps) {
  await connection();
  if (!getSupabaseConfig()) redirect("/auth/configuration");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=%2Fadmin");

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_study_admin");
  if (roleError) return <SetupMessage title="Falta preparar la administración" detail="Aplica la migración de administración desde el SQL Editor de Supabase. Luego vuelve a cargar esta página."/>;
  if (isAdmin !== true) return <SetupMessage title="Esta sección es privada" detail="Tu cuenta todavía no tiene rol de administradora. Promueve tu propio correo con la consulta incluida al final de la migración de administración."/>;

  const params = await searchParams;
  const tab = params.tab === "plans" ? "plans" : params.tab === "payments" ? "payments" : "accounts";
  if (tab === "payments") {
    const [paymentResult, payoutResult, subscriptionResult, directoryResult] = await Promise.all([
      supabase.from("billing_payments").select("id,user_id,provider,plan,billing_period,status,original_currency,original_amount_minor,provider_fee_minor,provider_fee_currency,net_amount_minor,net_currency,provider_status,paid_at,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("billing_payouts").select("id,provider,currency,gross_amount_minor,fee_amount_minor,net_amount_minor,status,destination_label,settled_at,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("billing_subscriptions").select("id,user_id,provider,plan,billing_period,status,currency,amount_minor,current_period_ends_at,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("study_user_directory").select("user_id,email").limit(5000),
    ]);
    if (paymentResult.error || payoutResult.error || subscriptionResult.error || directoryResult.error) return <SetupMessage title="No se pudo cargar el registro de pagos" detail="Aplica la migración 202611130003_billing_foundation.sql en el proyecto Supabase y vuelve a cargar esta página."/>;
    return <main className="admin-page">
      <Link className="admin-back" href="/profile">← Volver al perfil</Link>
      <div className="eyebrow"><span className="sparkle">✳</span> SOLO ADMINISTRACIÓN</div>
      <h1>Pagos y liquidaciones</h1>
      <AdminTabs active="payments"/>
      <AdminPayments payments={paymentResult.data || []} payouts={payoutResult.data || []} subscriptions={subscriptionResult.data || []} emails={Object.fromEntries((directoryResult.data || []).map((entry: DirectoryEntry) => [entry.user_id, entry.email]))}/>
    </main>;
  }
  if (tab === "plans") return <main className="admin-page">
    <Link className="admin-back" href="/profile">← Volver al perfil</Link>
    <div className="eyebrow"><span className="sparkle">✳</span> SOLO ADMINISTRACIÓN</div>
    <h1>Planes y precios</h1>
    <AdminTabs active="plans"/>
    <PlansCatalog/>
  </main>;
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,display_name,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (profilesError || !profiles) return <SetupMessage title="No se pudieron cargar las cuentas" detail="Comprueba que las migraciones estén aplicadas y vuelve a intentarlo."/>;

  const ids = profiles.map((profile) => profile.id);
  const [directoryResult, planResult] = ids.length ? await Promise.all([
    supabase.from("study_user_directory").select("user_id,email").in("user_id", ids),
    supabase.from("user_plans").select("user_id,plan,billing_period,payment_status,period_ends_at").in("user_id", ids),
  ]) : [{ data: [] as DirectoryEntry[], error: null }, { data: [] as UserPlan[], error: null }];
  if (directoryResult.error || !directoryResult.data) return <SetupMessage title="No se pudieron cargar los correos" detail="Comprueba que la migración de administración esté aplicada."/>;
  if (planResult.error || !planResult.data) return <SetupMessage title="No se pudieron cargar los planes" detail="Ejecuta 202611120002_plan_catalog.sql y luego 202611120003_private_ld_and_annual_bonus.sql en el SQL Editor del mismo proyecto Supabase. Después, recarga esta página."/>;

  const emailByUser = new Map((directoryResult.data as DirectoryEntry[]).map((entry) => [entry.user_id, entry.email]));
  const planByUser = new Map((planResult.data as UserPlan[]).map((plan) => [plan.user_id, plan]));
  // This server component runs per request after connection(); the timestamp is request-specific.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isActiveVip = (plan: UserPlan | { plan: "free"; payment_status: "free"; period_ends_at: null }) =>
    ((plan.plan === "ld" || plan.plan === "dixon") && plan.payment_status === "comped" && (!plan.period_ends_at || new Date(plan.period_ends_at).getTime() > now)) ||
    ((plan.plan === "plus" || plan.plan === "pro") && (plan.payment_status === "paid" || plan.payment_status === "comped") && Boolean(plan.period_ends_at && new Date(plan.period_ends_at).getTime() > now));
  const activeVipCount = profiles.filter(profile => isActiveVip(planByUser.get(profile.id) || { plan: "free", payment_status: "free", period_ends_at: null })).length;
  const notice = typeof params.saved === "string" ? "Cambios guardados." : errorMessage(
    typeof params.error === "string" ? params.error : undefined,
    typeof params.code === "string" ? params.code : undefined,
    typeof params.detail === "string" ? params.detail : undefined,
  );

  return <main className="admin-page">
    <Link className="admin-back" href="/profile">← Volver al perfil</Link>
    <div className="eyebrow"><span className="sparkle">✳</span> SOLO ADMINISTRACIÓN</div>
    <h1>Cuentas y planes</h1>
    <AdminTabs active="accounts"/>
    <p className="admin-intro">Asigna Gratis, Study Plus, Study Pro o L.D. Los VIP bonificados de Study Plus o Study Pro se muestran como L.D. mientras estén vigentes; L.D. es privado, ilimitado y solo tú puedes asignarlo o quitarlo. Los cobros todavía se registran manualmente.</p>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <section className="admin-summary"><div><strong>{profiles.length}</strong><span>cuentas registradas</span></div><div><strong>{activeVipCount}</strong><span>VIP activos</span></div><div><strong>{profiles.length - activeVipCount}</strong><span>sin VIP</span></div><small>Se muestran las 500 cuentas más recientes.</small></section>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cuenta y estado</th><th>Plan, pago e inicio (vencimiento automático)</th><th></th><th></th></tr></thead><tbody>
      {profiles.map((profile: Profile) => {
        const current = planByUser.get(profile.id) || { plan: "free" as const, billing_period: "none" as const, payment_status: "free" as const, period_ends_at: null };
        const email = emailByUser.get(profile.id) || "Correo no disponible";
        const active = isActiveVip(current);
        const expired = Boolean(current.period_ends_at && new Date(current.period_ends_at).getTime() <= now && current.payment_status !== "free");
        const vipLabel = active ? `VIP ${getPlanName(current.plan, current.payment_status, current.period_ends_at)}` : expired ? "Vencido · sin VIP" : current.payment_status === "unpaid" ? "Impago · sin VIP" : "Sin VIP";
        return <tr key={profile.id}>
          <td data-label="Cuenta"><strong>{profile.display_name || "Estudiante"}</strong><small>{email}</small><span className={`admin-vip-badge ${active ? "active" : "inactive"}`}>{vipLabel}</span></td>
          <td data-label="Editar plan" colSpan={3}><PlanForm
            action={updateUserPlan}
            userId={profile.id}
            email={email}
            plan={current.plan === "dixon" ? "ld" : current.plan}
            billingPeriod={current.billing_period}
            paymentStatus={current.payment_status}
            startsAt={current.plan === "plus" || current.plan === "pro" ? getPlanStartDate(current.billing_period, current.period_ends_at) : new Date().toISOString().slice(0, 10)}
          /></td>
        </tr>;
      })}
      {profiles.length === 0 && <tr><td colSpan={4} className="admin-empty">Todavía no hay cuentas registradas.</td></tr>}
    </tbody></table></div>
    <p className="admin-footnote">Elige la fecha de inicio; el vencimiento se calcula automáticamente según el plan. Para dar un año gratis, selecciona <b>Anual</b> y <b>Bonificado</b>. El VIP se desactivará al vencer.</p>
  </main>;
}

function getPlanStartDate(period: BillingPeriod, periodEndsAt: string | null) {
  if (period === "none") return new Date().toISOString().slice(0, 10);
  if (!periodEndsAt) return new Date().toISOString().slice(0, 10);
  const end = new Date(periodEndsAt);
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  const endDay = end.getUTCDate();
  const monthsToSubtract = period === "monthly" ? 1 : 12;
  const targetMonthIndex = endMonth - monthsToSubtract;
  const targetYear = endYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12 + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(endDay, lastDay))).toISOString().slice(0, 10);
}

function AdminTabs({ active }: { active: "accounts" | "plans" | "payments" }) {
  return <nav className="admin-tabs" aria-label="Secciones de administración">
    <Link className={active === "accounts" ? "active" : ""} href="/admin?tab=accounts">Cuentas</Link>
    <Link className={active === "plans" ? "active" : ""} href="/admin?tab=plans">Planes y precios</Link>
    <Link className={active === "payments" ? "active" : ""} href="/admin?tab=payments">Pagos y liquidaciones</Link>
  </nav>;
}

function SetupMessage({ title, detail }: { title: string; detail: string }) {
  return <main className="admin-page"><Link className="admin-back" href="/profile">← Volver al perfil</Link><section className="admin-setup"><div className="eyebrow">CONFIGURACIÓN</div><h1>{title}</h1><p>{detail}</p><Link href="/auth/configuration">Ver configuración de Supabase →</Link></section></main>;
}

function errorMessage(error?: string, code?: string, detail?: string) {
  switch (error) {
    case "invalid": return "Los datos enviados no son válidos.";
    case "combination": return "La combinación de plan, vigencia y pago no es válida.";
    case "date": return "La fecha de inicio no es válida.";
    case "private": return "Solo la cuenta administradora principal puede asignar o quitar L.D.";
    case "save":
      return `No se pudieron guardar. Supabase respondió ${code || "sin código"}: ${detail || "sin detalle"}`;
    default: return null;
  }
}
