"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const plans = ["free", "monthly", "annual"] as const;
const paymentStatuses = ["free", "paid", "comped", "unpaid"] as const;

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
  const paymentStatus = String(formData.get("payment_status") || "");
  const endDate = String(formData.get("period_ends_at") || "");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) redirect("/admin?error=invalid");
  if (!plans.includes(plan as typeof plans[number]) || !paymentStatuses.includes(paymentStatus as typeof paymentStatuses[number])) redirect("/admin?error=invalid");
  if ((plan === "free") !== (paymentStatus === "free")) redirect("/admin?error=combination");

  let periodEndsAt: string | null = null;
  if (endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) redirect("/admin?error=date");
    const parsed = new Date(`${endDate}T23:59:59.999Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== endDate) redirect("/admin?error=date");
    periodEndsAt = parsed.toISOString();
  }

  const { supabase, user } = await getAdminClient();
  const { error } = await supabase.from("user_plans").upsert({
    user_id: userId,
    plan,
    payment_status: paymentStatus,
    period_ends_at: periodEndsAt,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) redirect("/admin?error=save");
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}
