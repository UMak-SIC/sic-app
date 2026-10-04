"use client";

import * as React from "react";
import {
  FileCsv,
  X,
  FileText,
  CaretDown,
  FolderOpen,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AttendeeFileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null, content?: string) => void;
  onLoadRosterText?: (text: string) => void;
  parsedCount?: number;
  className?: string;
}

const SAMPLE_ROSTERS = [
  {
    label: "Sample IT Roster (3 students)",
    text: `Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph, BSIT\nMiguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph, BSIT\nBianca Flores, 2023-00612, bianca.flores@umak.edu.ph, BSIT`,
  },
  {
    label: "Sample CS Roster (2 students)",
    text: `Patricia Reyes, 2023-00911, patricia.reyes@umak.edu.ph, BSCS\nJoshua Lim, 2023-00823, joshua.lim@umak.edu.ph, BSCS`,
  },
  {
    label: "Full Batch Roster (5 students)",
    text: `Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph, BSIT\nMiguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph, BSIT\nBianca Flores, 2023-00612, bianca.flores@umak.edu.ph, BSIT\nPatricia Reyes, 2023-00911, patricia.reyes@umak.edu.ph, BSCS\nJoshua Lim, 2023-00823, joshua.lim@umak.edu.ph, BSCS`,
  },
];

function CloudGraphic() {
  return (
    <div className="relative flex items-center justify-center size-28">
      <svg
        width="110"
        height="88"
        viewBox="0 0 64 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
      >
        <path
          d="M48 20.5C46.8 9.8 37.8 1.5 26.8 1.5C17.5 1.5 9.5 7.4 6.6 15.8C2.9 18 -0.05 21.4 0 25.5C0 31.8 5.1 37 11.5 37H48C56.3 37 63 30.3 63 22C63 14.3 57.2 7.9 49.7 7.1"
          fill="#2da482"
          fillOpacity="0.88"
        />
        <path
          d="M47.5 20.5C47.5 20.5 53.5 24 55.5 29C57.5 34 53.5 37 47.5 37H11.5C5.1 37 0 31.8 0 25.5C0 20.3 3.6 15.9 8.5 14.6C9.5 6 17.1 1.5 26.8 1.5C36.3 1.5 44 7.7 46 20.5Z"
          fill="#269374"
          fillOpacity="0.95"
        />
        <path
          d="M32 14L32 31M32 14L24 22M32 14L40 22"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function AttendeeFileDropzone({
  file,
  onFileSelect,
  onLoadRosterText,
  parsedCount = 0,
  className,
}: AttendeeFileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const readFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileSelect(f, content);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) readFile(dropped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) readFile(picked);
    e.target.value = "";
  };

  const handleClear = () => {
    onFileSelect(null, "");
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative flex flex-1 min-h-[340px] flex-col items-center justify-between rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 bg-white dark:bg-card",
          isDragging
            ? "border-[#2da482] bg-green-soft/50 scale-[1.01]"
            : file
            ? "border-[#2da482]/50"
            : "border-[#2da482]/70 hover:border-[#2da482] hover:bg-green-soft/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          className="hidden"
          onChange={handleChange}
        />

        {file ? (
          /* File Loaded State */
          <div className="flex flex-col items-center justify-center gap-3 my-auto w-full">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-green-soft text-green border border-green-border shadow-xs">
              <FileCsv size={36} weight="bold" />
            </div>
            <div className="max-w-[85%]">
              <p className="font-sans text-sm font-bold text-ink truncate">
                {file.name}
              </p>
              <p className="font-sans text-xs text-muted mt-0.5">
                {parsedCount} valid student{parsedCount !== 1 ? "s" : ""} found
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="mt-2 h-8 gap-1.5 rounded-full border-line text-xs font-semibold text-muted hover:text-red hover:border-red-border hover:bg-red-soft/30 cursor-pointer shadow-2xs"
            >
              <X size={13} weight="bold" />
              <span>Remove file</span>
            </Button>
          </div>
        ) : (
          /* Mockup Dropzone State with Reduced Gaps & Border-Green Button */
          <>
            {/* Top Cloud, Heading & OR (Tight Gap) */}
            <div className="flex flex-col items-center justify-center gap-1.5 pt-1 my-auto">
              <CloudGraphic />
              <h3 className="font-display text-xl font-bold text-ink tracking-tight">
                Drop file here
              </h3>
              <span className="font-sans text-[11px] font-semibold text-muted/70 uppercase tracking-widest -mt-0.5">
                OR
              </span>
            </div>

            {/* Actions: Upload File & Select from Library */}
            <div className="flex flex-col items-center gap-2 w-full max-w-[230px] my-auto">
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full h-10 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-sans text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Upload File
              </Button>

              {/* Select from library: slightly larger, border green, bg transparent */}
              {onLoadRosterText && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl border border-[#2da482] bg-transparent text-xs font-semibold text-[#2da482] hover:bg-[#2da482]/10 hover:border-[#269374] transition-all cursor-pointer shadow-2xs"
                    >
                      <FolderOpen size={14} weight="bold" />
                      <span>Select from library</span>
                      <CaretDown size={11} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="w-60 rounded-xl border-line bg-card p-1.5 shadow-lg font-sans"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                      Sample Rosters
                    </div>
                    {SAMPLE_ROSTERS.map((roster) => (
                      <DropdownMenuItem
                        key={roster.label}
                        onClick={() => onLoadRosterText(roster.text)}
                        className="flex items-center gap-2 rounded-lg text-xs font-medium text-ink cursor-pointer hover:bg-canvas py-1.5"
                      >
                        <FileText size={14} className="text-[#2da482] shrink-0" />
                        <span className="truncate">{roster.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Bottom Support Text */}
            <p className="font-sans text-[11px] text-muted font-normal pb-0.5">
              Only CSV, TXT and TSV files are supported
            </p>
          </>
        )}
      </div>
    </div>
  );
}
