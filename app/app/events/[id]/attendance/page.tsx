import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getEventAttendance } from "@/lib/services/attendance-service";
import { LiveRefresh } from "@/components/attendance/LiveRefresh";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ query?: string | string[] }>;
}) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    notFound();
  }

  const { id } = await params;
  const { query } = await searchParams;
  const search = typeof query === "string" ? query : undefined;
  const event = await getEventAttendance(id, search);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="font-mono text-xs tracking-[0.24em] text-cyan-300">LIVE ATTENDANCE</p>
        <div className="mt-3 flex flex-col gap-5 border-b border-slate-700 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.name}</h1>
            <p className="mt-2 text-slate-400">Live roster and arrival record</p>
          </div>
          <div className="rounded border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-right">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-200">Checked in</p>
            <p className="text-3xl font-semibold text-cyan-100">{event.attendedCount} / {event.totalRosterEntries}</p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex max-w-md flex-1 gap-2">
            <label className="sr-only" htmlFor="attendance-search">Search attendees</label>
            <input
              className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300"
              defaultValue={search}
              id="attendance-search"
              name="query"
              placeholder="Search name, email, or student ID"
            />
            <button className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950" type="submit">Search</button>
          </form>
          <Link
            className="rounded border border-slate-500 px-4 py-2 text-center text-sm font-semibold hover:border-cyan-300 hover:text-cyan-200"
            href={`/api/events/${event.id}/attendance/export`}
          >
            Export CSV
          </Link>
        </div>
        <div className="mt-3"><LiveRefresh /></div>

        <div className="mt-5 overflow-x-auto rounded border border-slate-700">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Arrival</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {event.rosterEntries.map((entry) => (
                <tr key={entry.attendee.studentId}>
                  <td className="px-4 py-3"><p className="font-medium">{entry.attendee.name}</p><p className="text-slate-400">{entry.attendee.displayEmail}</p></td>
                  <td className="px-4 py-3 font-mono text-slate-300">{entry.attendee.studentId}</td>
                  <td className="px-4 py-3"><span className={entry.status === "ATTENDED" ? "text-cyan-300" : entry.status === "ABSENT" ? "text-rose-300" : "text-amber-200"}>{entry.status.toLowerCase()}</span></td>
                  <td className="px-4 py-3 text-slate-300">{entry.arrivedAt?.toLocaleString() ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
