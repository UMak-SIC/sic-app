"use client";

import * as React from "react";
import { UserPlus, UploadSimple, Warning, Spinner } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { AttendeesInsightsCard } from "@/components/attendees/attendees-insights-card";
import { AttendeesToolbar } from "@/components/attendees/attendees-toolbar";
import {
  AttendeesTable,
  AttendeeItem,
} from "@/components/attendees/attendees-table";
import { AttendeesPagination } from "@/components/attendees/attendees-pagination";
import { AddAttendeeDialog } from "@/components/attendees/add-attendee-dialog";
import { ImportAttendeesDialog } from "@/components/attendees/import-attendees-dialog";
import { AddToEventDialog, type AvailableEvent } from "@/components/attendees/add-to-event-dialog";
import {
  DEFAULT_PAGE_SIZE,
  fetchAttendeeDirectory,
  fetchAvailableEvents,
  fetchFullAttendeeList,
  type PageSize,
} from "@/components/attendees/attendee-directory";

/**
 * Wait before searching, so typing a name does not fire a request per keystroke.
 */
const SEARCH_DEBOUNCE_MS = 300;

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

export default function AttendeesPage() {
  const [students, setStudents] = React.useState<AttendeeItem[]>([]);
  const [pagination, setPagination] = React.useState<Pagination>(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [eventsFilter, setEventsFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);

  /**
   * Which request the rows and any error on screen belong to.
   *
   * Loading is derived by comparing this against the key that is wanted, rather
   * than being set inside the fetch effect. Setting it there would be a
   * synchronous state write on every render pass, and would also flash "loading"
   * again for a response that is already on screen.
   */
  const wantedKey = `${searchQuery}|${currentPage}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<{ key: string; message: string } | null>(null);

  const isLoading = loadedKey !== wantedKey;
  const visibleError = loadError?.key === wantedKey ? loadError.message : null;

  // Dialog States
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isAddToEventOpen, setIsAddToEventOpen] = React.useState(false);
  const [targetStudentForEvent, setTargetStudentForEvent] = React.useState<AttendeeItem | null>(null);

  // Events for the "add to event" picker, and the whole registry for the import
  // dialog's duplicate check. Neither is the directory page, which holds one page
  // of one filtered result.
  const [availableEvents, setAvailableEvents] = React.useState<AvailableEvent[]>([]);
  const [everyAttendee, setEveryAttendee] = React.useState<AttendeeItem[]>([]);
  const [registryIsComplete, setRegistryIsComplete] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchAvailableEvents(controller.signal)
      .then((result) => {
        if (active) setAvailableEvents(result.events);
      })
      .catch(() => {
        // The picker shows an empty state rather than a stale list, so this is
        // deliberately not surfaced as a page-level error.
        if (active) setAvailableEvents([]);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!isImportOpen) return;

    const controller = new AbortController();
    let active = true;

    fetchFullAttendeeList(controller.signal)
      .then((result) => {
        if (!active) return;
        setEveryAttendee(result.attendees);
        setRegistryIsComplete(result.complete);
      })
      .catch(() => {
        if (!active) return;
        setEveryAttendee([]);
        setRegistryIsComplete(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isImportOpen]);

  // Debounce the search box into the query the API is asked for. The selection is
  // cleared here rather than in an effect, because a search is a user action: a
  // selection that spans result sets would name people the operator cannot see.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
      setSelectedIds([]);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };

  // The registry is the source of truth. Every load replaces the table rather than
  // merging into it, so nothing on screen can claim to be a person who is not in
  // the database.
  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchAttendeeDirectory({
      query: searchQuery,
      page: currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        setStudents(result.attendees);
        setPagination(result.pagination);
        setLoadError(null);
        setLoadedKey(wantedKey);
      })
      .catch((error: unknown) => {
        // An aborted request is a superseded one, not a failure to report.
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setStudents([]);
        setPagination(EMPTY_PAGINATION);
        setLoadError({
          key: wantedKey,
          message:
            error instanceof Error
              ? error.message
              : "The directory could not be loaded. Try again.",
        });
        // Marked loaded so the failure shows instead of a spinner that never ends.
        setLoadedKey(wantedKey);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [searchQuery, currentPage, wantedKey]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === students.length ? [] : students.map((s) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  /**
   * No write endpoint exists for any of these yet, so they say so rather than
   * changing a table the next load would overwrite.
   */
  const notSavedYet = (action: string) => {
    setNotice(`${action} is not saved. Nothing on this page is connected to the registry for that yet.`);
  };

  const handleAddStudent = () => notSavedYet("Adding a student");

  const handleImportStudents = () => notSavedYet("Importing a student list");

  const handleConfirmAddToEvent = () => notSavedYet("Adding students to an event");

  const handleBatchDelete = () => notSavedYet("Removing students");

  const handleRemoveStudent = () => notSavedYet("Removing a student");

  const handleReorder = () => notSavedYet("Reordering");

  // Export CSV — client-side over what is on screen, so it exports the current
  // page rather than the whole registry.
  const handleExportCSV = () => {
    const exportSource =
      selectedIds.length > 0
        ? students.filter((s) => selectedIds.includes(s.id))
        : students;

    const headers = [
      "Name",
      "Student ID",
      "Email",
      "Course Track",
      "Degree Program",
      "Section",
      "Registered Events Count",
      "Attendance Rate (%)",
      "Joined Date",
    ];

    const rows = exportSource.map((s) => [
      `"${s.name}"`,
      `"${s.studentId}"`,
      `"${s.email}"`,
      `"${s.course ?? ""}"`,
      `"${s.program ?? ""}"`,
      `"${s.section ?? ""}"`,
      `"${s.totalEventsJoined}"`,
      `"${s.attendanceRate.toFixed(1)}%"`,
      `"${s.joinedDate}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_directory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedStudentNames = students
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => s.name);

  return (
    <div className="flex flex-col gap-6 w-full pb-12 font-sans">
      <PageHeader
        title={<span className="font-bold font-display text-ink">Attendee Directory</span>}
        description="Master list of CCIS computing students imported once and added to events later."
        action={
          <div className="flex items-center gap-2.5">
            <PageHeaderButton
              onClick={() => setIsAddOpen(true)}
              variant="outline"
              icon={<UserPlus size={18} weight="bold" className="text-green" />}
            >
              Add Student
            </PageHeaderButton>
            <PageHeaderButton
              onClick={() => setIsImportOpen(true)}
              icon={<UploadSimple size={18} weight="bold" className="text-white" />}
            >
              Import Student List
            </PageHeaderButton>
          </div>
        }
      />

      <AttendeesInsightsCard />

      {notice ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[6px] border border-amber-border bg-amber-soft px-3.5 py-3 text-xs text-ink"
        >
          <Warning size={16} weight="bold" className="mt-px shrink-0 text-amber" aria-hidden />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto shrink-0 text-[11px] text-muted hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <AttendeesToolbar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        courseFilter={courseFilter}
        onCourseFilterChange={setCourseFilter}
        eventsFilter={eventsFilter}
        onEventsFilterChange={setEventsFilter}
        filtersUnavailable
        totalCount={pagination.total}
        filteredCount={pagination.total}
        selectedCount={selectedIds.length}
        onClearSelection={handleClearSelection}
        onBatchAddToEvent={() => {
          setTargetStudentForEvent(null);
          setIsAddToEventOpen(true);
        }}
        onBatchDelete={handleBatchDelete}
        onExport={handleExportCSV}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAddStudent={() => setIsAddOpen(true)}
      />

      {visibleError ? (
        <div
          role="alert"
          className="rounded-[6px] border border-amber-border bg-amber-soft px-3.5 py-3 text-xs text-ink"
        >
          {visibleError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <Spinner size={16} className="animate-spin" aria-hidden />
          Loading students…
        </div>
      ) : null}

      {!isLoading && !visibleError ? (
        <AttendeesTable
          attendees={students}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onReorder={handleReorder}
          onAddToEvent={(student) => {
            setTargetStudentForEvent(student);
            setIsAddToEventOpen(true);
          }}
          onRemoveAttendee={handleRemoveStudent}
        />
      ) : null}

      <AttendeesPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize as PageSize}
        onPageChange={goToPage}
      />

      <AddAttendeeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAddAttendee={handleAddStudent}
      />

      <ImportAttendeesDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingAttendees={everyAttendee}
        onImport={handleImportStudents}
        registryIsComplete={registryIsComplete}
      />

      <AddToEventDialog
        open={isAddToEventOpen}
        onOpenChange={setIsAddToEventOpen}
        selectedCount={targetStudentForEvent ? 1 : selectedIds.length}
        studentNames={targetStudentForEvent ? [targetStudentForEvent.name] : selectedStudentNames}
        onConfirm={handleConfirmAddToEvent}
        availableEvents={availableEvents}
      />
    </div>
  );
}
