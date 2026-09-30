"use client";

import * as React from "react";
import { Key, CircleNotch, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { normalizeTicketCode } from "@/lib/security/qr-signer";
import { cn } from "@/lib/utils";
import type { CheckInResponse } from "@/lib/services/checkin-service";

interface ManualTicketEntryProps {
  eventName?: string;
  onValidate: (code: string) => Promise<CheckInResponse>;
  onSwitchToCamera?: () => void;
  className?: string;
}

export function ManualTicketEntry({
  onValidate,
  className,
}: ManualTicketEntryProps) {
  const [ticketCode, setTicketCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<CheckInResponse | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = normalizeTicketCode(raw);
    setTicketCode(formatted);
    if (result) setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = ticketCode.trim();
    if (!cleanCode || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await onValidate(cleanCode);
      setResult(res);
    } catch {
      setResult({
        status: "invalid",
        message: "Unable to validate ticket code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs",
        className
      )}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="ticketCodeInput"
            className="block text-xs font-semibold text-slate-700 font-sans"
          >
            Ticket Code
          </label>
          <div className="relative">
            <input
              id="ticketCodeInput"
              type="text"
              value={ticketCode}
              onChange={handleInputChange}
              placeholder="SIC-XXXX-XXXX"
              autoComplete="off"
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 py-3.5 pr-11 font-mono text-base font-bold tracking-wider text-slate-900 shadow-inner transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:border-cyan focus:bg-white focus:ring-2 focus:ring-cyan/20 focus:outline-hidden"
            />
            <Key
              size={20}
              weight="bold"
              className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !ticketCode.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan py-3 font-sans text-sm font-bold text-white shadow-xs transition-all hover:bg-cyan-dark active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <CircleNotch size={18} weight="bold" className="animate-spin" />
          ) : null}
          Validate Ticket
        </button>

        {/* Dynamic validation feedback if an error or notice occurs */}
        {result && result.status !== "duplicate" && (
          <div
            className={cn(
              "rounded-xl p-3 text-xs leading-snug font-sans transition-all",
              result.status === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            )}
          >
            <div className="flex items-start gap-2">
              {result.status === "success" ? (
                <CheckCircle size={16} weight="bold" className="mt-0.5 shrink-0 text-emerald-700" />
              ) : (
                <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
              )}
              <span>{result.message}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
