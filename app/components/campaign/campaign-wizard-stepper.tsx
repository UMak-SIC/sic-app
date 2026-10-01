"use client";

import * as React from "react";
import { Users, NotePencil, Paperclip, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type WizardStep = 1 | 2 | 3;

interface CampaignWizardStepperProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  maxAccessibleStep?: number;
}

const STEPS = [
  {
    step: 1 as WizardStep,
    title: "1. Choose Event & Students",
    description: "Pick target audience",
    icon: Users,
  },
  {
    step: 2 as WizardStep,
    title: "2. Write Message",
    description: "Subject & friendly message",
    icon: NotePencil,
  },
  {
    step: 3 as WizardStep,
    title: "3. Add Banner, Files & Preview",
    description: "Attachments, test & send",
    icon: Paperclip,
  },
];

export function CampaignWizardStepper({
  currentStep,
  onStepClick,
  maxAccessibleStep = 3,
}: CampaignWizardStepperProps) {
  return (
    <div className="w-full bg-card rounded-[12px] border border-line p-2.5 shadow-xs">
      <nav aria-label="Campaign creation steps" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STEPS.map((item) => {
          const isCompleted = currentStep > item.step;
          const isActive = currentStep === item.step;
          const isClickable = item.step <= maxAccessibleStep && onStepClick !== undefined;
          const Icon = item.icon;

          return (
            <button
              key={item.step}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (isClickable) onStepClick(item.step);
              }}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-[9px] text-left transition-all",
                isActive
                  ? "bg-cyan-soft border border-cyan-border shadow-xs"
                  : isCompleted
                  ? "bg-canvas/50 hover:bg-canvas text-ink"
                  : "bg-transparent text-muted opacity-75",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                  isActive
                    ? "bg-cyan text-white shadow-xs"
                    : isCompleted
                    ? "bg-green text-white"
                    : "bg-line text-muted"
                )}
              >
                {isCompleted ? (
                  <Check size={16} weight="bold" />
                ) : (
                  <Icon size={16} weight={isActive ? "bold" : "regular"} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-xs font-semibold font-display tracking-tight truncate",
                    isActive ? "text-ink font-bold" : isCompleted ? "text-ink" : "text-muted"
                  )}
                >
                  {item.title}
                </div>
                <div className="text-[10px] text-muted truncate font-sans">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
