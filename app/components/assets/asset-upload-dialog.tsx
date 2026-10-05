"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UploadSimple,
  CloudArrowUp,
  Image as ImageIcon,
  FilePdf,
  WarningCircle,
  X,
  File,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssetUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssetUploaded: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function AssetUploadDialog({
  open,
  onOpenChange,
  onAssetUploaded,
}: AssetUploadDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsUploading(false);
    setErrorMessage(null);
  };

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);

    // Validate size
    if (file.size > MAX_BYTES) {
      setErrorMessage("File exceeds the maximum limit of 10 MB. Please choose a smaller file.");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Unsupported file format. Please upload JPG, PNG, WebP, or PDF.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      const response = await fetch("/api/assets/public/upload", { method: "POST", body: formData });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not upload that file. Please try again.");

      onAssetUploaded();
      resetState();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not upload that file. Please try again.");
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg bg-card border-line rounded-[14px] p-0 overflow-hidden shadow-2xl font-sans">
        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Modal Header */}
        <div className="p-5 pr-12 border-b border-line bg-paper flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-cyan-soft flex items-center justify-center text-cyan shrink-0">
              <UploadSimple size={22} weight="bold" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-bold text-ink tracking-tight">
                Upload New File
              </DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5 font-sans">
                Upload images or PDF documents to your event media library.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 bg-card">
          {!selectedFile ? (
            /* Dropzone State */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-[12px] p-8 flex flex-col items-center justify-center text-center gap-2.5 transition-colors cursor-pointer",
                isDragging
                  ? "border-cyan bg-cyan-soft/30"
                  : "border-line-subtle bg-paper/50 hover:border-cyan/50 hover:bg-canvas/30"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-cyan-soft flex items-center justify-center text-cyan shadow-2xs">
                <CloudArrowUp size={26} weight="bold" />
              </div>
              <div>
                <div className="text-xs font-semibold text-ink font-sans">
                  Drag & drop file here, or{" "}
                  <span className="text-cyan underline">browse files</span>
                </div>
                <div className="text-[11px] text-muted font-sans mt-1">
                  Supports JPG, PNG, WebP, or PDF (Max 10 MB per file)
                </div>
              </div>
            </div>
          ) : (
            /* File Selected Ready State */
            <div className="p-4 rounded-[10px] bg-paper border border-line flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[8px] bg-cyan-soft flex items-center justify-center shrink-0">
                    {selectedFile.type.startsWith("image/") ? (
                      <ImageIcon size={20} className="text-cyan" weight="bold" />
                    ) : (
                      <FilePdf size={20} className="text-red" weight="bold" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink font-sans truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-muted font-sans mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetState}
                  className="p-1 rounded-[4px] text-muted hover:text-red hover:bg-red-soft/40 cursor-pointer"
                  title="Choose another file"
                >
                  <X size={16} />
                </button>
              </div>

              {filePreviewUrl && (
                <div className="mt-1 max-h-36 rounded-[6px] overflow-hidden border border-line bg-ink/90 flex items-center justify-center p-1">
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="max-h-32 object-contain rounded-[4px]"
                  />
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-soft border border-red-border rounded-[8px] text-xs text-red flex items-center gap-2">
              <WarningCircle size={16} className="text-red shrink-0" weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 bg-canvas/40 rounded-[8px] border border-line text-[11px] text-muted font-sans leading-relaxed">
            <strong className="text-ink font-semibold">Policy note:</strong> Files linked to active events or announcements are automatically protected from accidental deletion.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-paper flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-[6px] h-9 px-3 border-line cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleStartUpload}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
          >
            <UploadSimple size={15} weight="bold" />
            <span>{isUploading ? "Uploading file..." : "Upload File"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
