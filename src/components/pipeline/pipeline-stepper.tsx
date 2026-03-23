"use client";

import { Check, Loader2, Circle, AlertCircle, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/stores/pipeline-store";
import { STAGE_NAMES } from "@/types/pipeline";
import type { StageStatus } from "@/types/brand";

function StageIcon({ status, stage }: { status: StageStatus; stage: number }) {
  switch (status) {
    case "approved":
      return <Check className="h-3.5 w-3.5" />;
    case "processing":
      return <span>{stage}</span>;
    case "review":
      return <span>{stage}</span>;
    case "failed":
      return <X className="h-3.5 w-3.5" />;
    case "invalidated":
      return <AlertCircle className="h-3.5 w-3.5" />;
    default:
      return <span>{stage}</span>;
  }
}

export function PipelineStepper() {
  const { currentStage, stages, setCurrentStage } = usePipelineStore();

  return (
    <div className="flex items-center w-full gap-0">
      {Array.from({ length: 9 }, (_, i) => {
        const stage = i + 1;
        const state = stages[stage];
        const isActive = stage === currentStage;
        const canClick = state?.status !== "not_started";
        const status = state?.status || "not_started";

        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => canClick && setCurrentStage(stage)}
              disabled={!canClick}
              className="flex flex-col items-center gap-0"
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-300",
                  status === "approved"
                    ? "bg-primary border-primary text-primary-foreground"
                    : status === "processing"
                      ? "border-primary text-primary animate-pulse"
                      : status === "review"
                        ? "border-primary/60 text-primary bg-primary/10"
                        : status === "failed"
                          ? "border-destructive text-destructive"
                          : status === "invalidated"
                            ? "border-yellow-500 text-yellow-500"
                            : "border-muted text-muted-foreground"
                )}
              >
                <StageIcon status={status} stage={stage} />
              </div>
              <span
                className={cn(
                  "text-[11px] mt-1 text-center max-w-[60px] truncate",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {STAGE_NAMES[stage]}
              </span>
            </button>

            {/* Connecting line */}
            {i < 8 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-1 mb-5",
                  status === "approved" ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
