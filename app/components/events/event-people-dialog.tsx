"use client";

import * as React from "react";
import { FileArrowUp, MagnifyingGlass, UserPlus, Users, UserGear } from "@phosphor-icons/react";
import { AttendeeFormDialog } from "@/components/attendees/attendee-form-dialog";
import { commitImport, previewImport, type ImportPreview } from "@/components/attendees/attendee-import";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DirectoryAttendee = { id: string; name: string; studentId: string; email: string; course: string | null };
type Target = "attendees" | "organizers";

type Props = {
  eventId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventPeopleDialog({ eventId, eventName, open, onOpenChange }: Props) {
  const [attendees, setAttendees] = React.useState<DirectoryAttendee[]>([]);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = React.useState<string[]>([]);
  const [selectedOrganizerIds, setSelectedOrganizerIds] = React.useState<string[]>([]);
  const [target, setTarget] = React.useState<Target>("attendees");
  const [query, setQuery] = React.useState("");
  const [addingPerson, setAddingPerson] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [directoryPage, setDirectoryPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [csvImport, setCsvImport] = React.useState<{ content: string; preview: ImportPreview } | null>(null);

  const load = React.useEffectEvent(async () => {
    const [directoryResponse, peopleResponse] = await Promise.all([
      fetch("/api/attendees?pageSize=100"),
      fetch(`/api/events/${eventId}/people`),
    ]);
    if (!directoryResponse.ok || !peopleResponse.ok) {
      setError("People could not be loaded. Refresh the page and try again.");
      return;
    }
    const [directory, people] = await Promise.all([directoryResponse.json(), peopleResponse.json()]);
    setAttendees(directory.attendees);
    setDirectoryPage(directory.pagination.page);
    setTotalPages(directory.pagination.totalPages);
    setSelectedAttendeeIds(people.attendees.map((person: DirectoryAttendee) => person.id));
    setSelectedOrganizerIds(people.organizers.map((person: DirectoryAttendee) => person.id));
  });

  React.useEffect(() => {
    if (open) void Promise.resolve().then(load);
  }, [open]);

  const selectedIds = target === "attendees" ? selectedAttendeeIds : selectedOrganizerIds;
  const setSelectedIds = target === "attendees" ? setSelectedAttendeeIds : setSelectedOrganizerIds;
  const filtered = attendees.filter((attendee) =>
    [attendee.name, attendee.studentId, attendee.email, attendee.course ?? ""]
      .some((value) => value.toLowerCase().includes(query.toLowerCase().trim()))
  );

  function toggle(id: string) {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  }

  async function loadMore() {
    const nextPage = directoryPage + 1;
    const response = await fetch(`/api/attendees?pageSize=100&page=${nextPage}`);
    if (!response.ok) {
      setError("More people could not be loaded. Try again.");
      return;
    }
    const data = await response.json();
    setAttendees((current) => [...current, ...data.attendees]);
    setDirectoryPage(data.pagination.page);
    setTotalPages(data.pagination.totalPages);
  }

  async function importCsv(file: File) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const content = await file.text();
      const preview = await previewImport({ mode: "csv", content });
      setCsvImport({ content, preview });
      setNotice("Review the matched people before adding them to this event.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file could not be read. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCsvImport() {
    if (!csvImport) return;
    setBusy(true);
    setError("");
    try {
      const result = await commitImport({ mode: "csv", content: csvImport.content, approvedRows: csvImport.preview.approvableRows });
      if (result.attendeeIds.length === 0) {
        setNotice("No usable people were found in that file. Review the file and try again.");
        return;
      }
      await load();
      setSelectedIds((ids) => [...new Set([...ids, ...result.attendeeIds])]);
      setNotice(`${result.attendeeIds.length} people matched or added to the attendee directory and selected.`);
      setCsvImport(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file could not be imported. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/people`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeIds: selectedAttendeeIds, organizerIds: selectedOrganizerIds }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "People could not be saved. Try again.");
      }
      const saved = await response.json() as { attendeeIds: string[]; organizerIds: string[] };
      setSelectedAttendeeIds(saved.attendeeIds);
      setSelectedOrganizerIds(saved.organizerIds);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "People could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[94vw] max-w-3xl flex-col overflow-hidden rounded-[12px] border-line bg-card p-0 font-sans">
          <DialogHeader className="border-b border-line-subtle px-5 pb-4 pt-5">
            <DialogTitle className="font-display text-xl font-bold text-ink">Choose event people</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Select attendees and organizers for {eventName}. Everyone comes from the Global Attendees directory.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={target} onValueChange={(value) => setTarget(value as Target)} className="flex min-h-0 flex-1 flex-col px-5 pt-4">
            <TabsList className="w-fit">
              <TabsTrigger value="attendees" className="gap-1.5"><Users size={16} aria-hidden="true" />Attendees ({selectedAttendeeIds.length})</TabsTrigger>
              <TabsTrigger value="organizers" className="gap-1.5"><UserGear size={16} aria-hidden="true" />Organizers ({selectedOrganizerIds.length})</TabsTrigger>
            </TabsList>
            <TabsContent value={target} className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-2 border-b border-line-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, student ID, or email" className="h-9 rounded-[6px] border-line pl-9 text-xs" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddingPerson(true)} className="h-9 rounded-[6px] border-line text-xs"><UserPlus size={16} weight="bold" />Add person</Button>
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[6px] border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas">
                    <FileArrowUp size={16} weight="bold" aria-hidden="true" />Import CSV
                    <input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void importCsv(file);
                      event.currentTarget.value = "";
                    }} />
                  </label>
                </div>
              </div>
              <p className="py-2 text-[11px] text-muted">CSV rows are matched against the directory first. New people are added to the directory before they are selected.</p>
              {notice && <p className="mb-2 rounded-[6px] bg-cyan-soft px-3 py-2 text-xs text-ink">{notice}</p>}
              {error && <p role="alert" className="mb-2 rounded-[6px] bg-red-soft px-3 py-2 text-xs text-red">{error}</p>}
              {csvImport && <div className="mb-2 rounded-[6px] border border-cyan-border bg-cyan-soft/40 p-3 text-xs text-ink"><p className="font-semibold">Ready to import {csvImport.preview.approvableRows.length} people</p><p className="mt-1 text-muted">{csvImport.preview.summary.updateCount} matched in Global Attendees, {csvImport.preview.summary.newCount} new, {csvImport.preview.summary.malformed + csvImport.preview.summary.conflictCount} need attention.</p><div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={() => void confirmCsvImport()} className="rounded-[6px] bg-cyan text-xs text-white hover:bg-cyan-hover">Add matched people</Button><Button type="button" size="sm" variant="outline" onClick={() => setCsvImport(null)} className="rounded-[6px] border-line text-xs">Cancel import</Button></div></div>}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-[9px] border border-line">
                {filtered.map((attendee) => (
                  <label key={attendee.id} className="flex cursor-pointer items-center gap-3 border-b border-line-subtle px-3 py-3 last:border-b-0 hover:bg-canvas/50">
                    <Checkbox checked={selectedIds.includes(attendee.id)} onCheckedChange={() => toggle(attendee.id)} aria-label={`Select ${attendee.name}`} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{attendee.name}</span><span className="block truncate text-xs text-muted">{attendee.studentId} · {attendee.email}</span></span>
                    {attendee.course && <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">{attendee.course}</span>}
                  </label>
                ))}
                {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted">No people match this search.</p>}
              </div>
              {directoryPage < totalPages && <Button type="button" variant="outline" onClick={() => void loadMore()} className="mt-3 self-center rounded-[6px] border-line text-xs">Load more people</Button>}
            </TabsContent>
          </Tabs>
          <DialogFooter className="border-t border-line-subtle px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-[6px] border-line text-xs">Cancel</Button>
            <Button type="button" disabled={busy} onClick={() => void save()} className="rounded-[6px] bg-cyan text-xs text-white hover:bg-cyan-hover">{busy ? "Saving..." : "Save people"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addingPerson && <AttendeeFormDialog open={addingPerson} onOpenChange={setAddingPerson} onSaved={(person) => {
        void load().then(() => {
          setSelectedIds((ids) => [...new Set([...ids, person.id])]);
        });
        setNotice(`${person.restored ? "Restored" : "Added"} ${person.id ? "and selected" : ""}.`);
      }} />}
    </>
  );
}
