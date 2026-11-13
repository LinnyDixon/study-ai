"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculatePeriodEnd } from "@/lib/billing/period";

const plans = ["free", "plus", "pro", "ld"] as const;
const billingPeriods = ["none", "monthly", "annual"] as const;
const paymentStatuses = ["free", "paid", "comped", "unpaid"] as const;

function redirectWithSaveError(error: { code?: string; message?: string }): never {
  console.error("Could not save user plan:", error);
  const query = new URLSearchParams({
    error: "save",
    code: error.code || "unknown",
    detail: (error.message || "Supabase no devolvió un detalle.").replace(/\s+/g, " ").slice(0, 220),
  });
  redirect(`/admin?${query.toString()}`);
}

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=%2Fadmin");

  const { data: isAdmin, error } = await supabase.rpc("is_study_admin");
  if (error || isAdmin !== true) redirect("/app");
  return { supabase, user };
}

export async function updateUserPlan(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const plan = String(formData.get("plan") || "");
  const billingPeriod = String(formData.get("billing_period") || "");
  const paymentStatus = String(formData.get("payment_status") || "");
  const startDate = String(formData.get("period_starts_at") || "");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) redirect("/admin?error=invalid");
  if (!plans.includes(plan as typeof plans[number]) || !paymentStatuses.includes(paymentStatus as typeof paymentStatuses[number])) redirect("/admin?error=invalid");
  if (!billingPeriods.includes(billingPeriod as typeof billingPeriods[number])) redirect("/admin?error=invalid");
  const validCombination = plan === "free"
    ? paymentStatus === "free" && billingPeriod === "none"
    : plan === "ld"
      ? paymentStatus === "comped" && billingPeriod === "none"
      : paymentStatus !== "free" && (billingPeriod === "monthly" || billingPeriod === "annual");
  if (!validCombination) redirect("/admin?error=combination");

  let planStartsAt: Date | null = null;
  if (startDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) redirect("/admin?error=date");
    planStartsAt = new Date(`${startDate}T12:00:00.000Z`);
    if (Number.isNaN(planStartsAt.valueOf()) || planStartsAt.toISOString().slice(0, 10) !== startDate) redirect("/admin?error=date");
  }

  const { supabase, user } = await getAdminClient();
  const { data: existing, error: existingError } = await supabase.from("user_plans").select("plan,billing_period,payment_status,period_ends_at").eq("user_id", userId).maybeSingle();
  if (existingError) redirectWithSaveError(existingError);
  if ((plan === "ld" || existing?.plan === "ld" || existing?.plan === "dixon") && user.email?.toLowerCase() !== "ownersession2010@gmail.com") redirect("/admin?error=private");
  const now = new Date();
  const becomesActive = paymentStatus === "paid" || paymentStatus === "comped";
  const previousExpiry = existing?.period_ends_at ? new Date(existing.period_ends_at).getTime() : null;
  let periodEndsAt: string | null = null;
  if (plan === "ld") {
    periodEndsAt = null;
  } else if (plan === "plus" || plan === "pro") {
    const startsNewPeriod = existing?.plan !== plan || existing?.billing_period !== billingPeriod || existing?.payment_status === "unpaid" || previousExpiry === null || previousExpiry <= now.getTime();
    if (planStartsAt) {
      periodEndsAt = calculatePeriodEnd(planStartsAt, billingPeriod as "monthly" | "annual").toISOString();
    } else if (startsNewPeriod && becomesActive) {
      periodEndsAt = calculatePeriodEnd(now, billingPeriod as "monthly" | "annual").toISOString();
    } else {
      periodEndsAt = existing?.period_ends_at || null;
    }
  }

  const { error } = await supabase.from("user_plans").upsert({
    user_id: userId,
    plan,
    billing_period: billingPeriod,
    payment_status: paymentStatus,
    period_ends_at: periodEndsAt,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) redirectWithSaveError(error);
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}
