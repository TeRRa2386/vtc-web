"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Lightbulb, Mail, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

export type FeatureRequestRecord = {
  created_at?: string | null;
  description?: string | null;
  id: string;
  internal_notes?: string | null;
  profile_email?: string | null;
  status?: string | null;
  title?: string | null;
  updated_at?: string | null;
  user_email?: string | null;
  user_first_name?: string | null;
  user_id?: string | null;
  user_last_name?: string | null;
  user_name?: string | null;
};

const allValue = "all";
const statusOptions = ["open", "reviewing", "resolved", "closed"];

function statusTone(status?: string | null) {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "reviewing") return "warning";
  return "info";
}

export function FeatureRequestsWorkspace({ requests }: { requests: FeatureRequestRecord[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState(allValue);
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");
  const [drafts, setDrafts] = useState<Record<string, Partial<FeatureRequestRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((request) => statusFilter === allValue || request.status === statusFilter)
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? 0).getTime();
        return sortDirection === "newest" ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [requests, sortDirection, statusFilter]);

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? requests[0];
  const selectedDraft = selectedId && selectedRequest ? { ...selectedRequest, ...drafts[selectedRequest.id] } : null;
  const selectedUserName = selectedDraft
    ? selectedDraft.user_name?.trim() ||
      [selectedDraft.user_first_name, selectedDraft.user_last_name].filter(Boolean).join(" ").trim() ||
      "Name not available"
    : "";
  const selectedUserEmail = selectedDraft?.user_email || selectedDraft?.profile_email || "Unknown";

  function updateDraft(requestId: string, updates: Partial<FeatureRequestRecord>) {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        ...updates
      }
    }));
  }

  async function saveSelectedRequest() {
    if (!selectedDraft) return;

    setIsSaving(true);
    await fetch("/api/admin/support-tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedDraft.id,
        internal_notes: selectedDraft.internal_notes,
        status: selectedDraft.status
      })
    });

    setIsSaving(false);
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedDraft.id];
      return next;
    });
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[620px] overflow-hidden p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3">
            <div>
              <p className="text-sm font-black text-primary">{filteredRequests.length} requests</p>
              <p className="text-xs font-bold text-muted-foreground">Click a request to open full details.</p>
            </div>
            <Button
              onClick={() => setSortDirection((current) => (current === "newest" ? "oldest" : "newest"))}
              type="button"
              variant="outline"
            >
              {sortDirection === "newest" ? <ArrowDownAZ size={17} /> : <ArrowUpAZ size={17} />}
              {sortDirection === "newest" ? "Newest first" : "Oldest first"}
            </Button>
          </div>

          <div className="max-h-[560px] overflow-y-auto p-3">
            <div className="grid gap-3">
              {filteredRequests.map((request) => (
                <button
                  className="rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary/60 hover:bg-muted/45"
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  type="button"
                >
                  <div className="grid items-center gap-2 lg:grid-cols-[minmax(180px,1fr)_92px_158px]">
                    <h2 className="truncate text-base font-semibold">{request.title || "Feature request"}</h2>
                    <span className="justify-self-center">
                      <Badge tone={statusTone(request.status)}>{request.status ?? "open"}</Badge>
                    </span>
                    <span className="justify-self-start whitespace-nowrap text-xs font-normal text-muted-foreground lg:justify-self-end">
                      {formatDate(request.created_at)}
                    </span>
                  </div>
                </button>
              ))}
              {!filteredRequests.length ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  No feature requests match these filters.
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <aside className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="text-lg font-black">Filters</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
                Request status
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value={allValue}>All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </label>
            </div>
          </Card>
        </aside>
      </div>

      {selectedDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-card shadow-soft">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card p-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(selectedDraft.status)}>{selectedDraft.status ?? "open"}</Badge>
                </div>
                <h2 className="mt-3 text-2xl font-black">{selectedDraft.title || "Feature request"}</h2>
                <p className="mt-1 text-sm font-bold text-muted-foreground">{formatDate(selectedDraft.created_at)}</p>
              </div>
              <button
                aria-label="Close feature request details"
                className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setSelectedId("")}
                type="button"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid gap-4 p-5 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md bg-muted p-4">
                  <p className="flex items-center gap-2 font-black">
                    <Mail size={15} />
                    User
                  </p>
                  <p className="mt-2 break-words font-black text-foreground">{selectedUserName}</p>
                  <p className="mt-1 break-all text-muted-foreground">{selectedUserEmail}</p>
                  <p className="mt-1 break-all text-xs font-bold text-muted-foreground">{selectedDraft.user_id}</p>
                </div>
                <div className="rounded-md bg-muted p-4 text-xs font-bold leading-6 text-muted-foreground">
                  <p>Updated: {formatDate(selectedDraft.updated_at)}</p>
                </div>
              </div>

              <div className="rounded-md bg-muted p-4">
                <p className="flex items-center gap-2 font-black">
                  <Lightbulb size={15} />
                  Request
                </p>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{selectedDraft.description}</p>
              </div>

              <label className="grid gap-2 font-semibold text-muted-foreground">
                Status
                <Select
                  value={selectedDraft.status ?? "open"}
                  onChange={(event) => updateDraft(selectedDraft.id, { status: event.target.value })}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2 font-semibold text-muted-foreground">
                Internal notes
                <Textarea
                  onChange={(event) => updateDraft(selectedDraft.id, { internal_notes: event.target.value })}
                  placeholder="Private notes for the admin team..."
                  value={selectedDraft.internal_notes ?? ""}
                />
              </label>
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t bg-card p-5">
              <Button onClick={() => setSelectedId("")} type="button" variant="outline">
                Close
              </Button>
              <Button disabled={isSaving} onClick={saveSelectedRequest} type="button">
                <Save size={17} />
                {isSaving ? "Saving..." : "Save request"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
