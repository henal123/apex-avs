"use client";

import { Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/common/progress-tracker";
import type { JobProgress } from "@/types/brand";

interface ScrapeProgressProps {
  progress: JobProgress | null;
  onCancel?: () => void;
}

export function ScrapeProgress({ progress, onCancel }: ScrapeProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <Loader2 className="h-14 w-14 text-primary animate-spin" />
      <h2 className="text-xl font-light">Scraping Store...</h2>
      <div className="w-full max-w-md">
        <ProgressTracker
          total={progress?.items_total || 1}
          processed={progress?.items_processed || 0}
          failed={progress?.items_failed || 0}
          currentItem={progress?.current_item}
          label="Extracting store data"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This may take 30-60 seconds depending on the store size
      </p>
      {onCancel && (
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onCancel}>
          <StopCircle className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      )}
    </div>
  );
}
