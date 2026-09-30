"use client";

import * as React from "react";
import { X, FolderOpen } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventFileDropzoneProps {
  file: File | null;
  assetUrl: string | null;
  onFileSelect: (file: File | null) => void;
  onClearAssetUrl: () => void;
  onOpenLibraryPicker?: () => void;
  className?: string;
}

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

export function EventFileDropzone({
  file,
  assetUrl,
  onFileSelect,
  onClearAssetUrl,
  onOpenLibraryPicker,
  className,
}: EventFileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const previewUrl = file ? URL.createObjectURL(file) : assetUrl ?? null;
  const hasContent = !!previewUrl;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("image/")) {
      onClearAssetUrl();
      onFileSelect(dropped);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      onClearAssetUrl();
      onFileSelect(picked);
    }
    e.target.value = "";
  };

  const handleClear = () => {
    onFileSelect(null);
    onClearAssetUrl();
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-between min-h-[340px] h-full rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 overflow-hidden bg-white dark:bg-card",
        isDragging
          ? "border-[#2da482] bg-green-soft/50 scale-[1.01]"
          : hasContent
          ? "border-line"
          : "border-[#2da482]/70 hover:border-[#2da482] hover:bg-green-soft/20",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {hasContent ? (
        <>
          {/* Preview Image */}
          <img
            src={previewUrl!}
            alt="Event banner preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-ink/35 pointer-events-none" />

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            aria-label="Remove banner image"
            className="absolute top-3 right-3 z-10 flex items-center justify-center size-8 rounded-full bg-ink/70 text-white hover:bg-red/90 cursor-pointer transition-colors shadow-sm"
          >
            <X size={15} weight="bold" />
          </button>

          {/* Bottom label */}
          <div className="absolute bottom-3 inset-x-3 text-center z-10 bg-ink/60 backdrop-blur-xs rounded-xl py-1.5 px-3">
            <p className="font-sans text-xs font-semibold text-white truncate">
              {file ? file.name : "Selected Library Cover"}
            </p>
          </div>
        </>
      ) : (
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

            {onOpenLibraryPicker && (
              <button
                type="button"
                onClick={onOpenLibraryPicker}
                className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl border border-[#2da482] bg-transparent text-xs font-semibold text-[#2da482] hover:bg-[#2da482]/10 hover:border-[#269374] transition-all cursor-pointer shadow-2xs"
              >
                <FolderOpen size={14} weight="bold" />
                <span>Select from library</span>
              </button>
            )}
          </div>

          {/* Bottom Support Text */}
          <p className="font-sans text-[11px] text-muted font-normal pb-0.5">
            Only PNG, JPG and PDF files are supported
          </p>
        </>
      )}
    </div>
  );
}
