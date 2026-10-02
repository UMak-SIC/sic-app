"use client";

import * as React from "react";
import { CheckCircle, Clock, MagnifyingGlass, Ticket, UsersThree, XCircle } from "@phosphor-icons/react";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Person = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  attendanceStatus: "PENDING" | "ATTENDED" | "ABSENT";
  attendedAt: string | null;
  ticketSentAt: string | null;
};

export function EventPeopleTab({ eventId }: { eventId: string }) {
  const [people, setPeople] = React.useState<Person[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

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

  const filteredPeople = people.filter((person) =>
    [person.name, person.studentId, person.email].some((value) =>
      value.toLowerCase().includes(search.trim().toLowerCase())
    )
  );

  return (
    <section className="animate-in fade-in duration-150 overflow-hidden rounded-[12px] border border-line bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">People</h2>
          <p className="mt-1 text-xs text-muted">Everyone invited to this event and their ticket and attendance status.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search invited people"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, student ID, or email"
            className="h-9 w-full rounded-[6px] border border-line bg-card pl-9 pr-3 text-xs text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
      </div>

      {loading ? <p className="p-6 text-sm text-muted">Loading invited people...</p> : error ? <p role="alert" className="m-4 rounded-[6px] bg-red-soft px-3 py-2 text-xs text-red">{error}</p> : filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-14 text-center">
          <UsersThree size={24} weight="bold" className="text-muted" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-ink">No people found</h3>
          <p className="mt-1 text-xs text-muted">{people.length === 0 ? "Choose people for this event to see them here." : "No invited people match your search."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader><TableRow className="bg-canvas/50 hover:bg-canvas/50"><TableHead className="pl-5 text-xs font-bold text-muted">Person</TableHead><TableHead className="text-xs font-bold text-muted">Student ID</TableHead><TableHead className="text-xs font-bold text-muted">Ticket</TableHead><TableHead className="pr-5 text-xs font-bold text-muted">Attendance</TableHead></TableRow></TableHeader>
            <TableBody>{filteredPeople.map((person) => (
              <TableRow key={person.id} className="border-line-subtle hover:bg-canvas/40">
                <TableCell className="py-3 pl-5"><div className="flex items-center gap-3"><ProfileCircle name={person.name} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{person.name}</p><p className="truncate text-xs text-muted">{person.email}</p></div></div></TableCell>
                <TableCell className="py-3 font-mono text-xs text-muted">{person.studentId}</TableCell>
                <TableCell className="py-3">{person.ticketSentAt ? <Badge className="gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 text-xs font-semibold text-green shadow-none"><Ticket size={14} weight="bold" aria-hidden="true" />Sent</Badge> : <Badge className="gap-1 rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber shadow-none"><Clock size={14} weight="bold" aria-hidden="true" />Not sent</Badge>}</TableCell>
                <TableCell className="py-3 pr-5">{person.attendanceStatus === "ATTENDED" ? <Badge className="gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 text-xs font-semibold text-green shadow-none"><CheckCircle size={14} weight="bold" aria-hidden="true" />Attended</Badge> : person.attendanceStatus === "ABSENT" ? <Badge className="gap-1 rounded-full border border-red-border bg-red-soft px-2.5 py-0.5 text-xs font-semibold text-red shadow-none"><XCircle size={14} weight="bold" aria-hidden="true" />Absent</Badge> : <Badge className="gap-1 rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber shadow-none"><Clock size={14} weight="bold" aria-hidden="true" />Not recorded</Badge>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
