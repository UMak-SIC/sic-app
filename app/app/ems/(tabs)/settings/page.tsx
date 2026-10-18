"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { SystemSettingsView } from "@/components/settings/system-settings-view";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      <PageHeader
        title={
          <span className="font-display font-bold text-ink">
            How the platform operates automatically
          </span>
        }
        description="Attendance closing, multi-year privacy retention, file lifecycles, and administrator access boundaries. These rules run on schedule without manual effort."
      />

      <SystemSettingsView />
    </div>
  );
}
