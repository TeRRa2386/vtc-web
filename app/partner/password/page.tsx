import type { Metadata } from "next";

import { PartnerPasswordForm } from "@/components/partner/partner-password-form";

export const metadata: Metadata = {
  title: "Set Partner Password"
};

export default function PartnerPasswordPage() {
  return (
    <PartnerPasswordForm />
  );
}
