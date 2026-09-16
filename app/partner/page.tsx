import { redirect } from "next/navigation";

import { requirePartnerAccess } from "@/lib/supabase/partner";

export const dynamic = "force-dynamic";

export default async function PartnerPortalIndexPage() {
  const access = await requirePartnerAccess();
  redirect(`/partner/${access.partnerSlug}`);
}
