"use client";

import * as React from "react";
import { UserPlus, UploadSimple } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { AttendeesInsightsCard } from "@/components/attendees/attendees-insights-card";
import { AttendeesToolbar } from "@/components/attendees/attendees-toolbar";
import {
  AttendeesTable,
  AttendeeItem,
  CourseType,
} from "@/components/attendees/attendees-table";
import { AttendeesPagination } from "@/components/attendees/attendees-pagination";
import { AddAttendeeDialog } from "@/components/attendees/add-attendee-dialog";
import { ImportAttendeesDialog } from "@/components/attendees/import-attendees-dialog";
import { AddToEventDialog } from "@/components/attendees/add-to-event-dialog";

const INITIAL_DIRECTORY_DATA: AttendeeItem[] = [
  {
    id: "stu_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_2", title: "Cloud Computing 101", shortCode: "C101", date: "23 Oct", attended: true },
      { id: "evt_3", title: "UX Sprint Workshop", shortCode: "UX", date: "05 Nov", attended: true },
    ],
    totalEventsJoined: 3,
    attendedEventsCount: 3,
    attendanceRate: 100,
    joinedDate: "12 Sep 2026",
  },
  {
    id: "stu_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_4", title: "Annual Tech Summit", shortCode: "TS", date: "18 Nov", attended: false },
    ],
    totalEventsJoined: 2,
    attendedEventsCount: 1,
    attendanceRate: 50,
    joinedDate: "15 Sep 2026",
  },
  {
    id: "stu_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    course: "BSINS",
    program: "BS Information Systems",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
    ],
    totalEventsJoined: 1,
    attendedEventsCount: 1,
    attendanceRate: 100,
    joinedDate: "18 Sep 2026",
  },
  {
    id: "stu_4",
    name: "Joshua Ramos",
    studentId: "2022-01934",
    email: "joshua.ramos@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_2", title: "Cloud Computing 101", shortCode: "C101", date: "23 Oct", attended: true },
      { id: "evt_3", title: "UX Sprint Workshop", shortCode: "UX", date: "05 Nov", attended: false },
      { id: "evt_4", title: "Annual Tech Summit", shortCode: "TS", date: "18 Nov", attended: true },
    ],
    totalEventsJoined: 4,
    attendedEventsCount: 3,
    attendanceRate: 75,
    joinedDate: "01 Sep 2026",
  },
  {
    id: "stu_5",
    name: "Patricia Reyes",
    studentId: "2023-00823",
    email: "patricia.reyes@umak.edu.ph",
    course: "BSINS",
    program: "BS Information Systems",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_3", title: "UX Sprint Workshop", shortCode: "UX", date: "05 Nov", attended: true },
    ],
    totalEventsJoined: 2,
    attendedEventsCount: 2,
    attendanceRate: 100,
    joinedDate: "20 Sep 2026",
  },
  {
    id: "stu_6",
    name: "Mark Bautista",
    studentId: "2021-03412",
    email: "mark.bautista@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: false },
    ],
    totalEventsJoined: 1,
    attendedEventsCount: 0,
    attendanceRate: 0,
    joinedDate: "22 Sep 2026",
  },
  {
    id: "stu_7",
    name: "Chloe Lim",
    studentId: "2023-01129",
    email: "chloe.lim@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_2", title: "Cloud Computing 101", shortCode: "C101", date: "23 Oct", attended: true },
      { id: "evt_4", title: "Annual Tech Summit", shortCode: "TS", date: "18 Nov", attended: true },
    ],
    totalEventsJoined: 3,
    attendedEventsCount: 3,
    attendanceRate: 100,
    joinedDate: "05 Sep 2026",
  },
  {
    id: "stu_8",
    name: "Daniel Tan",
    studentId: "2022-02104",
    email: "daniel.tan@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    assignedEvents: [],
    totalEventsJoined: 0,
    attendedEventsCount: 0,
    attendanceRate: 0,
    joinedDate: "25 Sep 2026",
  },
  {
    id: "stu_9",
    name: "Samantha Mendoza",
    studentId: "2023-00341",
    email: "samantha.mendoza@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_2", title: "Cloud Computing 101", shortCode: "C101", date: "23 Oct", attended: true },
    ],
    totalEventsJoined: 2,
    attendedEventsCount: 2,
    attendanceRate: 100,
    joinedDate: "10 Sep 2026",
  },
  {
    id: "stu_10",
    name: "Gabriel Aquino",
    studentId: "2022-01452",
    email: "gabriel.aquino@umak.edu.ph",
    course: "BSINS",
    program: "BS Information Systems",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: false },
    ],
    totalEventsJoined: 1,
    attendedEventsCount: 0,
    attendanceRate: 0,
    joinedDate: "14 Sep 2026",
  },
  {
    id: "stu_11",
    name: "Eunice Castro",
    studentId: "2023-01829",
    email: "eunice.castro@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    assignedEvents: [
      { id: "evt_1", title: "General Assembly 2026", shortCode: "GA", date: "17 Oct", attended: true },
      { id: "evt_3", title: "UX Sprint Workshop", shortCode: "UX", date: "05 Nov", attended: true },
      { id: "evt_4", title: "Annual Tech Summit", shortCode: "TS", date: "18 Nov", attended: true },
    ],
    totalEventsJoined: 3,
    attendedEventsCount: 3,
    attendanceRate: 100,
    joinedDate: "16 Sep 2026",
  },
  {
    id: "stu_12",
    name: "Rafael David",
    studentId: "2021-02914",
    email: "rafael.david@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    assignedEvents: [],
    totalEventsJoined: 0,
    attendedEventsCount: 0,
    attendanceRate: 0,
    joinedDate: "27 Sep 2026",
  },
];

const PAGE_SIZE = 8;

export default function AttendeesPage() {
  const [students, setStudents] = React.useState<AttendeeItem[]>(INITIAL_DIRECTORY_DATA);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [eventsFilter, setEventsFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isAddToEventOpen, setIsAddToEventOpen] = React.useState(false);
  const [targetStudentForEvent, setTargetStudentForEvent] = React.useState<AttendeeItem | null>(null);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedStudents.map((s) => s.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Add Single Student
  const handleAddStudent = (
    newStudent: Omit<AttendeeItem, "id" | "assignedEvents" | "totalEventsJoined" | "attendedEventsCount" | "attendanceRate" | "joinedDate">
  ) => {
    const created: AttendeeItem = {
      ...newStudent,
      id: "stu_" + Date.now(),
      assignedEvents: [],
      totalEventsJoined: 0,
      attendedEventsCount: 0,
      attendanceRate: 0,
      joinedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
    setStudents((prev) => [created, ...prev]);
  };

  // Bulk Import Students with conflict overwrites support
  const handleImportStudents = (
    importedList: Omit<
      AttendeeItem,
      | "id"
      | "assignedEvents"
      | "totalEventsJoined"
      | "attendedEventsCount"
      | "attendanceRate"
      | "joinedDate"
    >[],
    overwrites: Array<{ id: string; updatedData: Partial<AttendeeItem> }> = []
  ) => {
    setStudents((prev) => {
      // 1. Apply overwrites to existing records
      let updatedList = prev;
      if (overwrites.length > 0) {
        const overwriteMap = new Map(overwrites.map((o) => [o.id, o.updatedData]));
        updatedList = prev.map((s) => {
          const update = overwriteMap.get(s.id);
          if (update) {
            return {
              ...s,
              ...update,
            };
          }
          return s;
        });
      }

      // 2. Prepend newly added attendees
      const createdList: AttendeeItem[] = importedList.map((item, index) => ({
        ...item,
        id: `stu_${Date.now()}_${index}`,
        assignedEvents: [],
        totalEventsJoined: 0,
        attendedEventsCount: 0,
        attendanceRate: 0,
        joinedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      }));

      return [...createdList, ...updatedList];
    });
  };

  // Batch / Single Add to Event
  const handleConfirmAddToEvent = (eventId: string) => {
    const eventTitles: Record<string, { title: string; shortCode: string; date: string }> = {
      evt_1: { title: "General Assembly 2026", shortCode: "GA", date: "17 Oct" },
      evt_2: { title: "Cloud Computing 101", shortCode: "C101", date: "23 Oct" },
      evt_3: { title: "UX Sprint Workshop", shortCode: "UX", date: "05 Nov" },
      evt_4: { title: "Annual Tech Summit", shortCode: "TS", date: "18 Nov" },
    };

    const targetIds = targetStudentForEvent
      ? [targetStudentForEvent.id]
      : selectedIds;

    const eventInfo = eventTitles[eventId] || { title: "Special Event", shortCode: "EVT", date: "TBD" };

    setStudents((prev) =>
      prev.map((s) => {
        if (!targetIds.includes(s.id)) return s;
        if (s.assignedEvents.some((e) => e.id === eventId)) return s;

        const newAssigned = [
          ...s.assignedEvents,
          {
            id: eventId,
            title: eventInfo.title,
            shortCode: eventInfo.shortCode,
            date: eventInfo.date,
            attended: false,
          },
        ];

        const total = newAssigned.length;
        const attended = newAssigned.filter((e) => e.attended).length;
        const rate = total > 0 ? (attended / total) * 100 : 0;

        return {
          ...s,
          assignedEvents: newAssigned,
          totalEventsJoined: total,
          attendedEventsCount: attended,
          attendanceRate: rate,
        };
      })
    );

    setSelectedIds([]);
    setTargetStudentForEvent(null);
  };

  // Batch Delete
  const handleBatchDelete = () => {
    setStudents((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
    setSelectedIds([]);
  };

  // Single Remove Student
  const handleRemoveStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  // Reorder
  const handleReorder = (newItems: AttendeeItem[]) => {
    setStudents(newItems);
  };

  // Filtered Students
  const filteredStudents = React.useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        student.name.toLowerCase().includes(q) ||
        student.studentId.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.program.toLowerCase().includes(q);

      const matchesCourse =
        courseFilter === "all" || student.course === courseFilter;

      let matchesEvents = true;
      if (eventsFilter === "active") {
        matchesEvents = student.totalEventsJoined > 0;
      } else if (eventsFilter === "unassigned") {
        matchesEvents = student.totalEventsJoined === 0;
      } else if (eventsFilter === "multiple") {
        matchesEvents = student.totalEventsJoined >= 3;
      }

      return matchesSearch && matchesCourse && matchesEvents;
    });
  }, [students, searchQuery, courseFilter, eventsFilter]);

  // Reset page on search or filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, courseFilter, eventsFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  // Export CSV
  const handleExportCSV = () => {
    const exportSource =
      selectedIds.length > 0
        ? students.filter((s) => selectedIds.includes(s.id))
        : filteredStudents;

    const headers = [
      "Name",
      "Student ID",
      "Email",
      "Course Track",
      "Degree Program",
      "Registered Events Count",
      "Attendance Rate (%)",
      "Joined Date",
    ];

    const rows = exportSource.map((s) => [
      `"${s.name}"`,
      `"${s.studentId}"`,
      `"${s.email}"`,
      `"${s.course}"`,
      `"${s.program}"`,
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
      {/* Page Header matching Screen 12 of mid-fid.html */}
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


      {/* Interactive Bar Chart for Course Engagement (BSIT, BSCS, BSINS) */}
      <AttendeesInsightsCard />

      {/* Directory Toolbar with Search & Course Filter */}
      <AttendeesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        courseFilter={courseFilter}
        onCourseFilterChange={setCourseFilter}
        eventsFilter={eventsFilter}
        onEventsFilterChange={setEventsFilter}
        totalCount={students.length}
        filteredCount={filteredStudents.length}
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

      {/* Master Student Directory Table */}
      <AttendeesTable
        attendees={paginatedStudents}
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

      {/* Pagination Controls */}
      <AttendeesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredStudents.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {/* Add Single Student Modal */}
      <AddAttendeeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAddAttendee={handleAddStudent}
      />

      {/* Bulk CSV / Paste Import Modal */}
      <ImportAttendeesDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingAttendees={students}
        onImport={handleImportStudents}
      />

      {/* Add to Event Modal */}
      <AddToEventDialog
        open={isAddToEventOpen}
        onOpenChange={setIsAddToEventOpen}
        selectedCount={targetStudentForEvent ? 1 : selectedIds.length}
        studentNames={targetStudentForEvent ? [targetStudentForEvent.name] : selectedStudentNames}
        onConfirm={handleConfirmAddToEvent}
      />
    </div>
  );
}
