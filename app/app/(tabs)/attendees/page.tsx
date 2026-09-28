"use client";

import * as React from "react";
import { UserPlus } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { AttendeesInsightsCard } from "@/components/attendees/attendees-insights-card";
import { AttendeesToolbar } from "@/components/attendees/attendees-toolbar";
import {
  AttendeesTable,
  AttendeeItem,
  AttendeeStatus,
} from "@/components/attendees/attendees-table";
import { AttendeesPagination } from "@/components/attendees/attendees-pagination";
import { AddAttendeeDialog } from "@/components/attendees/add-attendee-dialog";
import { ImportAttendeesDialog } from "@/components/attendees/import-attendees-dialog";
import { TicketPreviewDialog } from "@/components/attendees/ticket-preview-dialog";

const INITIAL_ATTENDEES: AttendeeItem[] = [
  {
    id: "att_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    ticketCode: "SIC-9F2K",
    status: "attended",
    checkedInAt: "2:14 PM",
  },
  {
    id: "att_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    ticketCode: "SIC-3B8L",
    status: "pending",
  },
  {
    id: "att_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    ticketCode: "SIC-7H1P",
    status: "absent",
  },
  {
    id: "att_4",
    name: "Joshua Ramos",
    studentId: "2022-01934",
    email: "joshua.ramos@umak.edu.ph",
    ticketCode: "SIC-4M9W",
    status: "attended",
    checkedInAt: "2:18 PM",
  },
  {
    id: "att_5",
    name: "Patricia Reyes",
    studentId: "2023-00823",
    email: "patricia.reyes@umak.edu.ph",
    ticketCode: "SIC-8N2X",
    status: "attended",
    checkedInAt: "2:22 PM",
  },
  {
    id: "att_6",
    name: "Mark Bautista",
    studentId: "2021-03412",
    email: "mark.bautista@umak.edu.ph",
    ticketCode: "SIC-1K6Y",
    status: "pending",
  },
  {
    id: "att_7",
    name: "Chloe Lim",
    studentId: "2023-01129",
    email: "chloe.lim@umak.edu.ph",
    ticketCode: "SIC-5P3Z",
    status: "attended",
    checkedInAt: "2:31 PM",
  },
  {
    id: "att_8",
    name: "Daniel Tan",
    studentId: "2022-02104",
    email: "daniel.tan@umak.edu.ph",
    ticketCode: "SIC-2J7V",
    status: "pending",
  },
  {
    id: "att_9",
    name: "Samantha Mendoza",
    studentId: "2023-00341",
    email: "samantha.mendoza@umak.edu.ph",
    ticketCode: "SIC-6K2A",
    status: "attended",
    checkedInAt: "2:35 PM",
  },
  {
    id: "att_10",
    name: "Gabriel Aquino",
    studentId: "2022-01452",
    email: "gabriel.aquino@umak.edu.ph",
    ticketCode: "SIC-9L4B",
    status: "pending",
  },
  {
    id: "att_11",
    name: "Eunice Castro",
    studentId: "2023-01829",
    email: "eunice.castro@umak.edu.ph",
    ticketCode: "SIC-3W7C",
    status: "attended",
    checkedInAt: "2:41 PM",
  },
  {
    id: "att_12",
    name: "Rafael David",
    studentId: "2021-02914",
    email: "rafael.david@umak.edu.ph",
    ticketCode: "SIC-8R1D",
    status: "absent",
  },
];

const PAGE_SIZE = 8;

export default function AttendeesPage() {
  const [attendees, setAttendees] = React.useState<AttendeeItem[]>(INITIAL_ATTENDEES);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [previewAttendee, setPreviewAttendee] = React.useState<AttendeeItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedAttendees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAttendees.map((a) => a.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Batch actions
  const handleBatchMarkAttended = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendees((prev) =>
      prev.map((att) =>
        selectedIds.includes(att.id)
          ? { ...att, status: "attended", checkedInAt: att.checkedInAt || now }
          : att
      )
    );
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    setAttendees((prev) => prev.filter((att) => !selectedIds.includes(att.id)));
    setSelectedIds([]);
  };

  // Status updates
  const handleToggleStatus = (id: string, newStatus: AttendeeStatus) => {
    setAttendees((prev) =>
      prev.map((att) => {
        if (att.id !== id) return att;
        return {
          ...att,
          status: newStatus,
          checkedInAt:
            newStatus === "attended"
              ? att.checkedInAt ||
                new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : undefined,
        };
      })
    );
  };

  // Remove single attendee
  const handleRemoveAttendee = (id: string) => {
    setAttendees((prev) => prev.filter((att) => att.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  // Add single attendee
  const handleAddAttendee = (
    newAttendee: Omit<AttendeeItem, "id" | "ticketCode">
  ) => {
    const randomCode =
      "SIC-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const created: AttendeeItem = {
      ...newAttendee,
      id: "att_" + Date.now(),
      ticketCode: randomCode,
    };
    setAttendees((prev) => [created, ...prev]);
  };

  // Bulk Import Attendees
  const handleImportAttendees = (
    newAttendees: Omit<AttendeeItem, "id" | "ticketCode">[]
  ) => {
    const createdList: AttendeeItem[] = newAttendees.map((item, index) => ({
      ...item,
      id: `att_${Date.now()}_${index}`,
      ticketCode: "SIC-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
    }));
    setAttendees((prev) => [...createdList, ...prev]);
  };

  // View ticket modal
  const handleViewTicket = (attendee: AttendeeItem) => {
    setPreviewAttendee(attendee);
    setIsPreviewOpen(true);
  };

  // Stats calculation
  const totalCount = attendees.length;
  const attendedCount = attendees.filter((a) => a.status === "attended").length;
  const pendingCount = attendees.filter((a) => a.status === "pending").length;
  const absentCount = attendees.filter((a) => a.status === "absent").length;

  // Filtered attendees
  const filteredAttendees = React.useMemo(() => {
    return attendees.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendees, searchQuery, statusFilter]);

  // Reset page when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAttendees.length / PAGE_SIZE);
  const paginatedAttendees = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAttendees.slice(start, start + PAGE_SIZE);
  }, [filteredAttendees, currentPage]);

  // Export CSV
  const handleExportCSV = () => {
    const exportSource =
      selectedIds.length > 0
        ? attendees.filter((a) => selectedIds.includes(a.id))
        : filteredAttendees;

    const headers = ["Name", "Student ID", "Email", "Ticket Code", "Status", "Checked In"];
    const rows = exportSource.map((a) => [
      `"${a.name}"`,
      `"${a.studentId}"`,
      `"${a.email}"`,
      `"${a.ticketCode}"`,
      `"${a.status}"`,
      `"${a.checkedInAt || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendee_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12 font-sans">
      {/* Page Header */}
      <PageHeader
        title={<span className="font-bold font-sans">Attendee Roster</span>}
        description="UMak SIC General Assembly · Manage participant verification, check-in flow, and roster entries."
        action={
          <PageHeaderButton
            onClick={() => setIsAddOpen(true)}
            icon={<UserPlus className="h-4 w-4 stroke-[2.2]" />}
          >
            Add Attendee
          </PageHeaderButton>
        }
      />

      {/* Top Insights Section (Full-Height Bar Chart + Clean Key Metrics) */}
      <AttendeesInsightsCard
        totalCount={totalCount}
        attendedCount={attendedCount}
        pendingCount={pendingCount}
        absentCount={absentCount}
      />

      {/* Toolbar (Search & Filter & Batch Actions & Import & Export) */}
      <AttendeesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalCount={totalCount}
        filteredCount={filteredAttendees.length}
        selectedCount={selectedIds.length}
        onClearSelection={handleClearSelection}
        onBatchMarkAttended={handleBatchMarkAttended}
        onBatchDelete={handleBatchDelete}
        onExport={handleExportCSV}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Roster Table with Selection Checkboxes */}
      <AttendeesTable
        attendees={paginatedAttendees}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleStatus={handleToggleStatus}
        onViewTicket={handleViewTicket}
        onRemoveAttendee={handleRemoveAttendee}
      />

      {/* Pagination Bar */}
      <AttendeesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredAttendees.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {/* Add Single Attendee Dialog */}
      <AddAttendeeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAddAttendee={handleAddAttendee}
      />

      {/* Bulk CSV Import Dialog */}
      <ImportAttendeesDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingAttendees={attendees}
        onImport={handleImportAttendees}
      />

      {/* Ticket Preview Dialog */}
      <TicketPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        attendee={previewAttendee}
      />
    </div>
  );
}
