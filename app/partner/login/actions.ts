"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSiteUrl(protocol: string, host: string | null, origin: string | null) {
  return origin ?? (host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export async function loginPartner(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/partner/login?error=missing");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/partner/login?error=auth");
  }

  redirect("/partner");
}

export async function loginPartnerWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const siteUrl = getSiteUrl(protocol, host, origin);

  (await cookies()).set("partner_oauth_next", "/partner", {
    httpOnly: true,
    maxAge: 300,
    path: "/",
    sameSite: "lax",
    secure: protocol === "https"
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  });

  if (error || !data.url) {
    redirect("/partner/login?error=oauth");
  }

  redirect(data.url);
}

export async function logoutPartner() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/partner/login");
}
