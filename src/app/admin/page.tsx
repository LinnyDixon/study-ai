import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { updateUserPlan } from "./actions";

export const metadata: Metadata = { title: "Administración · STUDY AI", robots: { index: false, follow: false } };
type AdminSearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Profile = { id: string; display_name: string; created_at: string };
type DirectoryEntry = { user_id: string; email: string };
type UserPlan = { user_id: string; plan: "free" | "monthly" | "annual"; payment_status: "free" | "paid" | "comped" | "unpaid"; period_ends_at: string | null };

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
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,display_name,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (profilesError || !profiles) return <SetupMessage title="No se pudieron cargar las cuentas" detail="Comprueba que las migraciones estén aplicadas y vuelve a intentarlo."/>;

  const ids = profiles.map((profile) => profile.id);
  const [directoryResult, planResult] = ids.length ? await Promise.all([
    supabase.from("study_user_directory").select("user_id,email").in("user_id", ids),
    supabase.from("user_plans").select("user_id,plan,payment_status,period_ends_at").in("user_id", ids),
  ]) : [{ data: [] as DirectoryEntry[], error: null }, { data: [] as UserPlan[], error: null }];
  if (directoryResult.error || !directoryResult.data) return <SetupMessage title="No se pudieron cargar los correos" detail="Comprueba que la migración de administración esté aplicada."/>;
  if (planResult.error || !planResult.data) return <SetupMessage title="No se pudieron cargar los planes" detail="Comprueba que la migración de administración esté aplicada."/>;

  const emailByUser = new Map((directoryResult.data as DirectoryEntry[]).map((entry) => [entry.user_id, entry.email]));
  const planByUser = new Map((planResult.data as UserPlan[]).map((plan) => [plan.user_id, plan]));
  const notice = typeof params.saved === "string" ? "Cambios guardados." : errorMessage(typeof params.error === "string" ? params.error : undefined);

  return <main className="admin-page">
    <Link className="admin-back" href="/profile">← Volver al perfil</Link>
    <div className="eyebrow"><span className="sparkle">✳</span> SOLO ADMINISTRACIÓN</div>
    <h1>Cuentas y planes</h1>
    <p className="admin-intro">Los correos solo aparecen aquí para tu cuenta administradora. El estado de pago se lleva manualmente; todavía no hay cobros automáticos.</p>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    <section className="admin-summary"><strong>{profiles.length}</strong><span>cuentas registradas</span><small>Se muestran las 500 cuentas más recientes.</small></section>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cuenta</th><th>Plan</th><th>Pago</th><th>Vence</th><th></th></tr></thead><tbody>
      {profiles.map((profile: Profile) => {
        const current = planByUser.get(profile.id) || { plan: "free" as const, payment_status: "free" as const, period_ends_at: null };
        const email = emailByUser.get(profile.id) || "Correo no disponible";
        return <tr key={profile.id}>
          <td><strong>{profile.display_name || "Estudiante"}</strong><small>{email}</small></td>
          <td colSpan={4}><form action={updateUserPlan} className="admin-plan-form">
            <input type="hidden" name="user_id" value={profile.id}/>
            <label className="sr-only" htmlFor={`plan-${profile.id}`}>Plan de {email}</label>
            <select id={`plan-${profile.id}`} name="plan" defaultValue={current.plan}><option value="free">Gratis</option><option value="monthly">Mensual</option><option value="annual">Anual</option></select>
            <label className="sr-only" htmlFor={`payment-${profile.id}`}>Estado de pago de {email}</label>
            <select id={`payment-${profile.id}`} name="payment_status" defaultValue={current.payment_status}><option value="free">Gratis</option><option value="paid">Pagó</option><option value="comped">Bonificado</option><option value="unpaid">Impago</option></select>
            <label className="sr-only" htmlFor={`end-${profile.id}`}>Fecha de vencimiento de {email}</label>
            <input id={`end-${profile.id}`} type="date" name="period_ends_at" defaultValue={current.period_ends_at?.slice(0, 10) || ""}/>
            <button type="submit">Guardar</button>
          </form></td>
        </tr>;
      })}
      {profiles.length === 0 && <tr><td colSpan={5} className="admin-empty">Todavía no hay cuentas registradas.</td></tr>}
    </tbody></table></div>
    <p className="admin-footnote">Para dar a tu mamá un año gratis, selecciona <b>Anual</b>, <b>Bonificado</b> y la fecha de vencimiento de un año. No se le cobrará.</p>
  </main>;
}

function SetupMessage({ title, detail }: { title: string; detail: string }) {
  return <main className="admin-page"><Link className="admin-back" href="/profile">← Volver al perfil</Link><section className="admin-setup"><div className="eyebrow">CONFIGURACIÓN</div><h1>{title}</h1><p>{detail}</p><Link href="/auth/configuration">Ver configuración de Supabase →</Link></section></main>;
}

function errorMessage(error?: string) {
  switch (error) {
    case "invalid": return "Los datos enviados no son válidos.";
    case "combination": return "Los planes pagos deben figurar como Pagó, Bonificado o Impago. El plan gratis debe usar Gratis.";
    case "date": return "La fecha de vencimiento no es válida.";
    case "save": return "No se pudieron guardar los cambios. Comprueba las migraciones.";
    default: return null;
  }
}
