"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") || "").trim();
  if (displayName.length < 1 || displayName.length > 80) {
    redirect("/profile?error=name");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/sign-in?next=%2Fprofile");

  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) redirect("/profile?error=save");
  revalidatePath("/");
  redirect("/profile?saved=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}
