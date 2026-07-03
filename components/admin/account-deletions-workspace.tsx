"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Save, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

export type AccountDeletionRequestRecord = {
  approved_at?: string | null;
  completed_at?: string | null;
  deleted_at?: string | null;
  deletion_error?: string | null;
  id: string;
  internal_notes?: string | null;
  reason?: string | null;
  requested_at?: string | null;
  scheduled_deletion_at?: string | null;
  status?: string | null;
  user_email?: string | null;
  user_id?: string | null;
};

function statusTone(status?: string | null) {
  if (status === "completed") return "success";
  if (status === "rejected") return "danger";
  if (status === "processing") return "warning";
  return "info";
}

function getRemainingLabel(scheduledDeletionAt?: string | null, now = Date.now()) {
  if (!scheduledDeletionAt) return null;

  const remainingMs = new Date(scheduledDeletionAt).getTime() - now;
  if (remainingMs <= 0) return "Ready to delete";

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (remainingHours <= 24) {
    return `${remainingHours} ${remainingHours === 1 ? "hour" : "hours"} left`;
  }

  const remainingDays = Math.ceil(remainingHours / 24);
  return `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`;
}

function isReadyToDelete(request: AccountDeletionRequestRecord, now = Date.now()) {
  return Boolean(
    request.status === "processing" &&
      request.scheduled_deletion_at &&
      new Date(request.scheduled_deletion_at).getTime() <= now
  );
}

export function AccountDeletionsWorkspace({ requests }: { requests: AccountDeletionRequestRecord[] }) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [autoExecutingIds, setAutoExecutingIds] = useState<Record<string, boolean>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((left, right) => {
      const leftTime = new Date(left.requested_at ?? 0).getTime();
      const rightTime = new Date(right.requested_at ?? 0).getTime();
      return rightTime - leftTime;
    });
  }, [requests]);

  useEffect(() => {
    sortedRequests.forEach((request) => {
      if (!isReadyToDelete(request, now) || autoExecutingIds[request.id]) {
        return;
      }

      setAutoExecutingIds((current) => ({ ...current, [request.id]: true }));
      void runAction(request, "execute");
    });
  }, [autoExecutingIds, now, sortedRequests]);

  async function runAction(request: AccountDeletionRequestRecord, action: "approve" | "cancel" | "execute" | "notes" | "remove") {
    setSavingId(`${request.id}-${action}`);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[request.id];
      return next;
    });
    const response = await fetch("/api/admin/account-deletions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        id: request.id,
        internal_notes: notes[request.id] ?? request.internal_notes ?? ""
      })
    });

    setSavingId("");

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setActionErrors((current) => ({
        ...current,
        [request.id]: body?.error ?? "Unable to update deletion request."
      }));
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {sortedRequests.map((request) => {
        const isDeleted = request.status === "completed" || Boolean(request.deleted_at);
        const isProcessing = request.status === "processing";
        const readyToDelete = isReadyToDelete(request, now);
        const remainingLabel = getRemainingLabel(request.scheduled_deletion_at, now);
        const noteValue = notes[request.id] ?? request.internal_notes ?? "";

        return (
          <Card className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]" key={request.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(request.status)}>{isDeleted ? "deleted" : request.status ?? "pending"}</Badge>
                {isProcessing && remainingLabel ? (
                  <Badge tone={readyToDelete ? "danger" : "warning"}>{remainingLabel}</Badge>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-black">{isDeleted ? "Deleted account" : request.user_email}</h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                Requested {formatDate(request.requested_at)}
              </p>
              {request.approved_at ? (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Accepted {formatDate(request.approved_at)}
                </p>
              ) : null}
              {request.scheduled_deletion_at && !isDeleted ? (
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Clock size={15} />
                  Scheduled deletion: {formatDate(request.scheduled_deletion_at)}
                </p>
              ) : null}
              {request.deleted_at ? (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Deleted {formatDate(request.deleted_at)}
                </p>
              ) : null}
              <p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">
                {request.reason || "No reason provided."}
              </p>
              {request.deletion_error ? (
                <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">
                  {request.deletion_error}
                </p>
              ) : null}
              {actionErrors[request.id] ? (
                <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">
                  {actionErrors[request.id]}
                </p>
              ) : null}
            </div>

            <div className="grid content-start gap-3">
              <Textarea
                disabled={isDeleted}
                onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                placeholder="Internal notes"
                value={noteValue}
              />

              {isDeleted ? (
                <Button disabled type="button" variant="secondary">
                  <Trash2 size={17} />
                  Deleted
                </Button>
              ) : isProcessing ? (
                <>
                  <div className="rounded-md bg-muted p-3 text-sm font-semibold text-muted-foreground">
                    {remainingLabel ?? "Deletion scheduled"}
                  </div>
                  <Button
                    disabled={savingId === `${request.id}-cancel`}
                    onClick={() => runAction(request, "cancel")}
                    type="button"
                    variant="outline"
                  >
                    <XCircle size={17} />
                    {savingId === `${request.id}-cancel` ? "Canceling..." : "Cancel deletion"}
                  </Button>
                  <Button
                    disabled={!readyToDelete || savingId === `${request.id}-execute`}
                    onClick={() => runAction(request, "execute")}
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 size={17} />
                    {savingId === `${request.id}-execute` ? "Deleting..." : "Delete now"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={savingId === `${request.id}-approve`}
                    onClick={() => runAction(request, "approve")}
                    type="button"
                    variant="destructive"
                  >
                    <ShieldAlert size={17} />
                    {savingId === `${request.id}-approve` ? "Accepting..." : "Accept request"}
                  </Button>
                  <Button
                    disabled={savingId === `${request.id}-remove`}
                    onClick={() => runAction(request, "remove")}
                    type="button"
                    variant="outline"
                  >
                    <XCircle size={17} />
                    {savingId === `${request.id}-remove` ? "Removing..." : "Remove request"}
                  </Button>
                </>
              )}

              {!isDeleted ? (
                <Button
                  disabled={savingId === `${request.id}-notes`}
                  onClick={() => runAction(request, "notes")}
                  type="button"
                  variant="outline"
                >
                  <Save size={17} />
                  {savingId === `${request.id}-notes` ? "Saving..." : "Save note"}
                </Button>
              ) : null}
            </div>
          </Card>
        );
      })}

      {!sortedRequests.length ? (
        <Card className="p-6 text-muted-foreground">No account deletion requests found.</Card>
      ) : null}
    </div>
  );
}
