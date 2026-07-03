"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Mail, MessageSquare, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

export type SupportTicketRecord = {
  category?: string | null;
  created_at?: string | null;
  id: string;
  internal_notes?: string | null;
  message?: string | null;
  priority?: string | null;
  response_seen_at?: string | null;
  status?: string | null;
  subject?: string | null;
  technician_name?: string | null;
  technician_response?: string | null;
  technician_response_at?: string | null;
  type?: string | null;
  updated_at?: string | null;
  profile_email?: string | null;
  user_email?: string | null;
  user_first_name?: string | null;
  user_id?: string | null;
  user_last_name?: string | null;
  user_name?: string | null;
};

const allValue = "all";
const statusOptions = ["open", "reviewing", "resolved", "closed"];
const typeOptions = ["bug", "account", "content", "other"];
const priorityOptions = ["low", "normal", "high", "urgent"];

function statusTone(status?: string | null) {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "reviewing") return "warning";
  return "info";
}

function priorityTone(priority?: string | null) {
  if (priority === "urgent" || priority === "high") return "danger";
  if (priority === "low") return "default";
  return "info";
}

export function SupportTicketsWorkspace({ tickets }: { tickets: SupportTicketRecord[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState(allValue);
  const [typeFilter, setTypeFilter] = useState(allValue);
  const [priorityFilter, setPriorityFilter] = useState(allValue);
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");
  const [drafts, setDrafts] = useState<Record<string, Partial<SupportTicketRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((ticket) => statusFilter === allValue || ticket.status === statusFilter)
      .filter((ticket) => typeFilter === allValue || ticket.type === typeFilter)
      .filter((ticket) => priorityFilter === allValue || (ticket.priority ?? "normal") === priorityFilter)
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? 0).getTime();
        return sortDirection === "newest" ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [priorityFilter, sortDirection, statusFilter, tickets, typeFilter]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? filteredTickets[0] ?? tickets[0];
  const selectedDraft = selectedId && selectedTicket ? { ...selectedTicket, ...drafts[selectedTicket.id] } : null;
  const selectedUserName = selectedDraft
    ? selectedDraft.user_name?.trim() ||
      [selectedDraft.user_first_name, selectedDraft.user_last_name].filter(Boolean).join(" ").trim() ||
      "Name not available"
    : "";
  const selectedUserEmail = selectedDraft?.user_email || selectedDraft?.profile_email || "Unknown";

  function updateDraft(ticketId: string, updates: Partial<SupportTicketRecord>) {
    setDrafts((current) => ({
      ...current,
      [ticketId]: {
        ...current[ticketId],
        ...updates
      }
    }));
  }

  async function saveSelectedTicket() {
    if (!selectedDraft) return;

    setIsSaving(true);
    await fetch("/api/admin/support-tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: selectedDraft.category,
        id: selectedDraft.id,
        internal_notes: selectedDraft.internal_notes,
        priority: selectedDraft.priority,
        status: selectedDraft.status,
        technician_response: selectedDraft.technician_response
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
            <p className="text-sm font-black text-primary">{filteredTickets.length} tickets</p>
            <p className="text-xs font-bold text-muted-foreground">Click a ticket to open full details.</p>
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
            {filteredTickets.map((ticket) => (
              <button
                className="rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary/60 hover:bg-muted/45"
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                type="button"
              >
                <div className="grid items-center gap-2 lg:grid-cols-[minmax(180px,1fr)_64px_64px_94px_158px]">
                  <h2 className="truncate text-base font-semibold">{ticket.subject || "Support request"}</h2>
                  <span className="justify-self-center">
                    <Badge tone={statusTone(ticket.status)}>{ticket.status ?? "open"}</Badge>
                  </span>
                  <span className="justify-self-center">
                    <Badge tone={priorityTone(ticket.priority)}>{ticket.priority ?? "normal"}</Badge>
                  </span>
                  <span className="justify-self-center">
                    <Badge>{ticket.type ?? ticket.category ?? "support"}</Badge>
                  </span>
                  <span className="justify-self-start whitespace-nowrap text-xs font-normal text-muted-foreground lg:justify-self-end">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
              </button>
            ))}
            {!filteredTickets.length ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No tickets match these filters.
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
              Ticket status
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value={allValue}>All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
              Ticket type
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value={allValue}>All types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
              Urgency
              <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value={allValue}>All urgency levels</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
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
                <Badge tone={priorityTone(selectedDraft.priority)}>{selectedDraft.priority ?? "normal"}</Badge>
                <Badge>{selectedDraft.type ?? selectedDraft.category ?? "support"}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-black">{selectedDraft.subject || "Support request"}</h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{formatDate(selectedDraft.created_at)}</p>
            </div>
            <button
              aria-label="Close ticket details"
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
                <p>Technician: {selectedDraft.technician_name || "Not assigned"}</p>
                <p>Response sent: {formatDate(selectedDraft.technician_response_at)}</p>
                <p>User saw response: {formatDate(selectedDraft.response_seen_at)}</p>
                <p>Updated: {formatDate(selectedDraft.updated_at)}</p>
              </div>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="flex items-center gap-2 font-black">
                <MessageSquare size={15} />
                Message
              </p>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{selectedDraft.message}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                Urgency
                <Select
                  value={selectedDraft.priority ?? "normal"}
                  onChange={(event) => updateDraft(selectedDraft.id, { priority: event.target.value })}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </Select>
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-muted-foreground">
              Public response
              <Textarea
                onChange={(event) => updateDraft(selectedDraft.id, { technician_response: event.target.value })}
                placeholder="Write a response the user can see in the app..."
                value={selectedDraft.technician_response ?? ""}
              />
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
            <Button disabled={isSaving} onClick={saveSelectedTicket} type="button">
              <Save size={17} />
              {isSaving ? "Saving..." : "Save ticket"}
            </Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
