import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "owner" | "admin" | "support" | "viewer";

export type AdminSession = {
  email: string;
  role: AdminRole;
  userId: string;
};

const roleRank: Record<AdminRole, number> = {
  viewer: 1,
  support: 2,
  admin: 3,
  owner: 4
};

export function canAdmin(role: AdminRole, minimum: AdminRole) {
  return roleRank[role] >= roleRank[minimum];
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Admin session check: no Supabase user session found");
    }
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (process.env.NODE_ENV !== "production") {
    console.info("Admin session check:", {
      adminError: error?.message ?? null,
      adminFound: Boolean(data),
      email: user.email,
      isActive: data?.is_active ?? null,
      role: data?.role ?? null,
      userId: user.id
    });
  }

  if (!data?.is_active) {
    return null;
  }

  return {
    email: user.email,
    role: data.role as AdminRole,
    userId: user.id
  };
}

export async function requireAdmin(minimumRole: AdminRole = "viewer") {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!canAdmin(session.role, minimumRole)) {
    redirect("/admin/blocked");
  }

  return session;
}

export async function requireApiAdmin(minimumRole: AdminRole = "viewer") {
  const session = await getAdminSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (!canAdmin(session.role, minimumRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}
