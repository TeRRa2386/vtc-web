import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type PartnerRole = "owner" | "manager" | "viewer";

export type PartnerAccess = {
  email: string;
  partnerId: string;
  partnerSlug: string;
  partnerName: string;
  role: PartnerRole;
  userId: string;
};

type PartnerUserRow = {
  role: PartnerRole;
  partner_id: string;
  partners: {
    id: string;
    name: string;
    slug: string;
    status: string | null;
  } | {
    id: string;
    name: string;
    slug: string;
    status: string | null;
  }[] | null;
};

export async function getPartnerAccess(): Promise<PartnerAccess[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("partner_users")
    .select("role, partner_id, partners(id, name, slug, status)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) {
    console.error("Partner access check failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as PartnerUserRow[])
    .map((row) => {
      const partner = Array.isArray(row.partners) ? row.partners[0] : row.partners;
      if (!partner) return null;
      return {
      email: user.email!,
      partnerId: row.partner_id,
      partnerName: partner.name,
      partnerSlug: partner.slug,
      role: row.role,
      userId: user.id
      };
    })
    .filter((row): row is PartnerAccess => Boolean(row));
}

export async function requirePartnerAccess(slug?: string) {
  const access = await getPartnerAccess();

  if (!access.length) {
    redirect("/partner/login");
  }

  if (!slug) {
    return access[0];
  }

  const selected = access.find((item) => item.partnerSlug === slug);
  if (!selected) {
    redirect("/partner/blocked");
  }

  return selected;
}

export async function requireApiPartnerAccess(partnerSlug?: string) {
  const access = await getPartnerAccess();

  if (!access.length) {
    return { access: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!partnerSlug) {
    return { access: access[0], error: null };
  }

  const selected = access.find((item) => item.partnerSlug === partnerSlug);
  if (!selected) {
    return { access: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { access: selected, error: null };
}
