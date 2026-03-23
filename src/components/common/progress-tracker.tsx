"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressTrackerProps {
  total: number;
  processed: number;
  failed?: number;
  currentItem?: string | null;
  label?: string;
}

export function ProgressTracker({
  total,
  processed,
  failed = 0,
  currentItem,
  label,
}: ProgressTrackerProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <Progress value={percent} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {processed}/{total} completed
          {failed > 0 && (
            <span className="text-destructive"> ({failed} failed)</span>
          )}
        </span>
        <span>{percent}%</span>
      </div>
      {currentItem && (
        <p className="text-xs text-muted-foreground truncate">
          Processing: {currentItem}
        </p>
      )}
    </div>
  );
}
