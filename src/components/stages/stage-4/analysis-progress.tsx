"use client";

import Image from "next/image";
import { Check, Loader2, AlertCircle, Clock, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/common/progress-tracker";
import { cn } from "@/lib/utils";
import type { AdLibraryAd } from "@/types/ad-library";
import type { JobProgress } from "@/types/brand";

interface AnalysisProgressProps {
  ads: AdLibraryAd[];
  progress: JobProgress | null;
  onCancel?: () => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <Check className="h-4 w-4 text-green-500" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function AnalysisProgress({ ads, progress, onCancel }: AnalysisProgressProps) {
  return (
    <div className="space-y-6">
      <div className="max-w-md mx-auto space-y-3">
        <ProgressTracker
          total={progress?.items_total || ads.length}
          processed={progress?.items_processed || 0}
          failed={progress?.items_failed || 0}
          currentItem={progress?.current_item}
          label="Analyzing ads with AI..."
        />
        {onCancel && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <StopCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Thumbnail grid with status overlays */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className={cn(
              "relative aspect-square rounded-md overflow-hidden border",
              ad.analysis_status === "complete" && "border-green-500/50",
              ad.analysis_status === "processing" && "border-blue-500/50",
              ad.analysis_status === "failed" && "border-destructive/50",
              ad.analysis_status === "pending" && "border-border opacity-50"
            )}
          >
            <Image
              src={ad.thumbnail_url || ad.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <StatusIcon status={ad.analysis_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
