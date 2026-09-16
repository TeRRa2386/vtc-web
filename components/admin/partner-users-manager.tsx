"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailPlus, RotateCw, ShieldOff, Trash2, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export type PartnerUserView = {
  created_at: string | null;
  email: string | null;
  id: string;
  invitation_sent_at: string | null;
  is_active: boolean;
  last_invited_at: string | null;
  role: string;
};

export function PartnerUsersManager({ partnerId, users }: { partnerId: string; users: PartnerUserView[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy("invite");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/partner-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          partnerId,
          role: String(form.get("role") ?? "viewer")
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Partner user could not be invited.");
        return;
      }
      event.currentTarget.reset();
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function updateUser(id: string, action: "disable" | "reactivate" | "resend" | "revoke") {
    setError("");
    setBusy(`${action}-${id}`);
    try {
      const response = await fetch("/api/admin/partner-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, partnerId })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Partner user could not be updated.");
        return;
      }
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Partner email
          <Input autoComplete="email" name="email" placeholder="partner@example.com" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
          Role
          <Select defaultValue="viewer" name="role">
            <option value="owner">owner</option>
            <option value="manager">manager</option>
            <option value="viewer">viewer</option>
          </Select>
        </label>
        <Button className="self-end" disabled={busy === "invite"} type="submit">
          <MailPlus size={17} />
          {busy === "invite" ? "Inviting..." : "Invite"}
        </Button>
      </form>

      {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm font-bold text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Invited</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr className="bg-background align-top" key={user.id}>
                <td className="px-4 py-3 font-black">{user.email ?? "Email unavailable"}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.is_active ? "success" : "default"}>{user.is_active ? "active" : "disabled"}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.last_invited_at ?? user.invitation_sent_at ?? user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy === `resend-${user.id}` || !user.email}
                      onClick={() => updateUser(user.id, "resend")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RotateCw size={15} />
                      Resend
                    </Button>
                    {user.is_active ? (
                      <Button
                        disabled={busy === `disable-${user.id}`}
                        onClick={() => updateUser(user.id, "disable")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ShieldOff size={15} />
                        Disable
                      </Button>
                    ) : (
                      <Button
                        disabled={busy === `reactivate-${user.id}`}
                        onClick={() => updateUser(user.id, "reactivate")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <UserCheck size={15} />
                        Reactivate
                      </Button>
                    )}
                    <Button
                      disabled={busy === `revoke-${user.id}`}
                      onClick={() => updateUser(user.id, "revoke")}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 size={15} />
                      Revoke
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? <div className="p-6 text-center text-muted-foreground">No partner users have access yet.</div> : null}
      </div>
    </div>
  );
}
