"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=missing");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/admin/login?error=auth");
  }

  redirect("/admin");
}

export async function loginAdminWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const siteUrl = origin ?? (host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL);
  const redirectTo = `${siteUrl}/auth/callback`;

  (await cookies()).set("admin_oauth_next", "/admin", {
    httpOnly: true,
    maxAge: 300,
    path: "/",
    sameSite: "lax",
    secure: protocol === "https"
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("Admin Google OAuth redirectTo:", redirectTo);
  }

  if (error || !data.url) {
    redirect("/admin/login?error=oauth");
  }

  redirect(data.url);
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
