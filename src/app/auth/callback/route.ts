import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) return NextResponse.redirect(new URL("/auth/configuration", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next") ?? undefined, "/app");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/auth/sign-in?error=callback", request.url));
}
