"use client";

import * as React from "react";
import { DownloadSimple, MagnifyingGlass, PencilSimpleLine, Ticket, UsersThree } from "@phosphor-icons/react";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import {
  AttendanceStatusBadge,
  attendanceStatusLabel,
  type AttendanceStatus,
} from "@/components/attendance/attendance-status-badge";
import { EventPeopleTableSkeleton } from "@/components/events/event-people-table-skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadExport } from "@/lib/exports";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  attendanceStatus: "PENDING" | "ATTENDED" | "ABSENT";
  attendedAt: string | null;
  ticketSentAt: string | null;
};

const ATTENDANCE_FILTERS = ["ALL", "ATTENDED", "ABSENT", "PENDING"] as const;
type AttendanceFilter = (typeof ATTENDANCE_FILTERS)[number];

const FILTER_LABELS: Record<AttendanceFilter, string> = {
  ALL: "All",
  ATTENDED: "Attended",
  ABSENT: "Absent",
  PENDING: "Not recorded",
};

function splitArrival(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const arrival = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${arrival.getFullYear()}-${pad(arrival.getMonth() + 1)}-${pad(arrival.getDate())}`,
    time: `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`,
  };
}

export function EventPeopleTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [people, setPeople] = React.useState<Person[]>([]);
  const [search, setSearch] = React.useState("");
  const [attendanceFilter, setAttendanceFilter] = React.useState<AttendanceFilter>("ALL");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  async function exportPeople() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    setNotice("");
    try {
      await downloadExport(`/api/events/${eventId}/attendance/export`, `${eventName.replace(/[\x00-\x1f\x7f"\\/]/g, "_")}-participants.csv`);
      setNotice("All event participants and attendance details exported.");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The list could not be exported. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const [savedMessage, setSavedMessage] = React.useState("");

  const [editing, setEditing] = React.useState<Person | null>(null);
  const [editingStatus, setEditingStatus] = React.useState<AttendanceStatus>("PENDING");
  const [editingDate, setEditingDate] = React.useState("");
  const [editingTime, setEditingTime] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editError, setEditError] = React.useState("");

  const loadPeople = React.useEffectEvent(async () => {
    setLoading(true);
    const response = await fetch(`/api/events/${eventId}/people/status`);
    if (!response.ok) {
      setError("People could not be loaded. Refresh the page and try again.");
      setLoading(false);
      return;
    }
    const data = await response.json() as { people: Person[] };
    setPeople(data.people);
    setError("");
    setLoading(false);
  });

  React.useEffect(() => { void Promise.resolve().then(loadPeople); }, [eventId]);

  React.useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  const openEdit = React.useEffectEvent((person: Person) => {
    setEditing(person);
    setEditingStatus(person.attendanceStatus);
    const arrival = splitArrival(person.attendedAt);
    setEditingDate(arrival.date);
    setEditingTime(arrival.time);
    setEditError("");
  });

  const saveEdit = React.useEffectEvent(async () => {
    if (!editing) return;
    setSaving(true);
    setEditError("");
    try {
      const attended = editingStatus === "ATTENDED";
      // Leave the arrival blank to keep the recorded arrival (or stamp "now"
      // for someone newly marked attended) — omit it so the API decides.
      const arrivalSeconds = (() => {
        if (!attended) return null as string | null;
        if (!editingDate && !editingTime) return undefined;
        if (!editingDate || !editingTime) {
          throw new Error("Fill in both the arrival date and time, or leave both blank.");
        }
        const arrival = new Date(`${editingDate}T${editingTime}`);
        if (Number.isNaN(arrival.getTime())) {
          throw new Error("Check the arrival date and time, then try again.");
        }
        return arrival.toISOString();
      })();
      const response = await fetch(`/api/events/${eventId}/people/status/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editingStatus, arrivedAt: arrivalSeconds }),
      });
      // A failed request can answer with a message, or with nothing readable
      // — fall back to a friendly line instead of a parse error either way.
      const rawBody = await response.text();
      let payload: { entry?: { attendanceStatus: AttendanceStatus; attendedAt: string | null }; error?: string } = {};
      try {
        payload = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        // Unreadable body — the friendly message below still applies.
      }
      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "This record could not be saved right now. Try again.");
      }

      const entry = payload.entry;
      setPeople((current) => current.map((person) =>
        person.id === editing.id
          ? { ...person, attendanceStatus: entry.attendanceStatus, attendedAt: entry.attendedAt }
          : person
      ));
      setSavedMessage(`Record saved for ${editing.name}.`);
      setEditing(null);
    } catch (saveFailure) {
      setEditError(saveFailure instanceof Error ? saveFailure.message : "This record could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  });

  const filteredPeople = people.filter((person) => {
    const matchesSearch = [person.name, person.studentId, person.email].some((value) =>
      value.toLowerCase().includes(search.trim().toLowerCase())
    );
    const matchesAttendance = attendanceFilter === "ALL" || person.attendanceStatus === attendanceFilter;
    return matchesSearch && matchesAttendance;
  });

  return (
    <section className="animate-in fade-in duration-150 overflow-hidden rounded-[12px] border border-line bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="shrink-0">
          <h2 className="font-display text-xl font-bold text-ink">People</h2>
          <p className="mt-1 text-xs text-muted">Everyone invited to this event and their ticket and attendance status.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
          <div className="relative min-w-0 flex-1 xl:w-64">
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search invited people"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, student ID, or email"
              className="h-9 w-full rounded-[6px] border border-line bg-card pl-9 pr-3 text-xs text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
          </div>
          <div
            role="group"
            aria-label="Filter by attendance"
            className="inline-flex w-full overflow-x-auto rounded-[9px] border border-line bg-canvas/60 p-0.5 text-xs sm:w-auto"
          >
            {ATTENDANCE_FILTERS.map((filter) => {
              const count = filter === "ALL"
                ? people.length
                : people.filter((person) => person.attendanceStatus === filter).length;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAttendanceFilter(filter)}
                  aria-pressed={attendanceFilter === filter}
                  className={cn(
                    "shrink-0 rounded-[6px] px-3 py-1.5 font-medium transition-colors cursor-pointer",
                    attendanceFilter === filter ? "bg-card font-bold text-ink shadow-xs" : "text-muted hover:text-ink"
                  )}
                >
                  {FILTER_LABELS[filter]} ({count})
                </button>
              );
            })}
          </div>
          <Button type="button" variant="outline" disabled={exporting || loading || !!error || people.length === 0} onClick={() => void exportPeople()} aria-busy={exporting} className="h-9 shrink-0 cursor-pointer gap-2 whitespace-nowrap rounded-[6px] border-line bg-paper font-sans text-xs font-semibold text-ink hover:bg-canvas [&_svg]:size-5">
            <DownloadSimple size={20} weight="bold" aria-hidden="true" />
            {exporting ? "Exporting..." : "Export all participants"}
          </Button>
        </div>
      </div>

      {exportError && <p role="alert" className="m-4 rounded-[6px] bg-red-soft px-3 py-2 text-xs text-red">{exportError}</p>}
      {notice && <p role="status" className="px-4 pt-3 text-xs text-muted">{notice}</p>}
      {savedMessage && (
        <p className="m-4 mb-0 rounded-[6px] border border-green-border bg-green-soft px-3 py-2 text-xs text-green" role="status">
          {savedMessage}
        </p>
      )}

      {loading ? (
        <EventPeopleTableSkeleton rowCount={5} />
      ) : error ? (
        <p role="alert" className="m-4 rounded-[6px] bg-red-soft px-3 py-2 text-xs text-red">{error}</p>
      ) : filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-14 text-center">
          <UsersThree size={24} weight="bold" className="text-muted" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-ink">No people found</h3>
          <p className="mt-1 text-xs text-muted">
            {people.length === 0
              ? "Choose people for this event to see them here."
              : "No invited people match your search or attendance filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader><TableRow className="bg-canvas/50 hover:bg-canvas/50"><TableHead className="pl-5 text-xs font-bold text-muted">Person</TableHead><TableHead className="text-xs font-bold text-muted">Student ID</TableHead><TableHead className="text-center text-xs font-bold text-muted">Ticket</TableHead><TableHead className="text-center text-xs font-bold text-muted">Attendance</TableHead><TableHead className="pr-5 text-right text-xs font-bold text-muted">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{filteredPeople.map((person) => (
              <TableRow key={person.id} className="border-line-subtle hover:bg-canvas/40">
                <TableCell className="py-3 pl-5"><div className="flex items-center gap-3"><ProfileCircle name={person.name} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{person.name}</p><p className="truncate text-xs text-muted">{person.email}</p></div></div></TableCell>
                <TableCell className="py-3 font-mono text-xs text-muted">{person.studentId}</TableCell>
                <TableCell className="py-3 text-center">{person.ticketSentAt ? <TicketSentBadge /> : <TicketNotSentBadge />}</TableCell>
                <TableCell className="py-3 text-center"><AttendanceStatusBadge status={person.attendanceStatus} /></TableCell>
                <TableCell className="py-3 pr-5 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEdit(person)}
                    className="h-8 gap-1.5 rounded-[6px] border-line px-3 text-xs font-semibold text-ink hover:bg-canvas"
                    aria-label={`Edit attendance record for ${person.name}`}
                  >
                    <PencilSimpleLine size={16} weight="bold" aria-hidden="true" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
          <DialogTitle className="font-display text-xl font-bold text-ink">Edit attendance record</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">
            {editing ? `${editing.name} · ${editing.studentId}` : null}
          </DialogDescription>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="attendance-status" className="text-xs font-semibold text-ink">Record</label>
              <Select value={editingStatus} onValueChange={(value) => setEditingStatus(value as AttendanceStatus)}>
                <SelectTrigger id="attendance-status" className="w-full cursor-pointer">
                  <SelectValue placeholder="Choose a record" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_FILTERS.filter((filter) => filter !== "ALL").map((status) => (
                    <SelectItem key={status} value={status}>{attendanceStatusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingStatus === "ATTENDED" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="attendance-arrival-date" className="text-xs font-semibold text-ink">Arrived at</label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attendance-arrival-date"
                    type="date"
                    value={editingDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setEditingDate(event.target.value)}
                    className="h-9 flex-1 rounded-[6px] border-line bg-card text-xs"
                  />
                  <Input
                    id="attendance-arrival-time"
                    type="time"
                    aria-label="Arrival time"
                    step={60}
                    value={editingTime}
                    onChange={(event) => setEditingTime(event.target.value)}
                    className="h-9 rounded-[6px] border-line bg-card text-xs"
                  />
                </div>
                <p className="text-[11px] text-muted">Leave these blank to record the arrival time as now.</p>
              </div>
            )}

            {editError && (
              <p role="alert" className="rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-red">{editError}</p>
            )}

            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="h-9 rounded-[6px] border-line text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void saveEdit()}
                className="h-9 rounded-[6px] bg-cyan text-xs font-semibold text-white hover:bg-cyan-hover"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TicketSentBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 text-xs font-semibold text-green shadow-none">
      <Ticket size={14} weight="bold" aria-hidden="true" />Sent</span>
  );
}

function TicketNotSentBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber shadow-none">
      <Ticket size={14} weight="bold" aria-hidden="true" />Not sent</span>
  );
}
