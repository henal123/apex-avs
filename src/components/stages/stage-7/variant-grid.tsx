"use client";

import Image from "next/image";
import axios from "axios";
import { Check, Loader2, RefreshCw, AlertCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressTracker } from "@/components/common/progress-tracker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { GeneratedAd } from "@/types/generation";
import type { JobProgress } from "@/types/brand";

interface VariantGridProps {
  ads: GeneratedAd[];
  brandId: string;
  isProcessing: boolean;
  progress: JobProgress | null;
  onUpdate: () => void;
  onCancel?: () => void;
}

export function VariantGrid({ ads, brandId, isProcessing, progress, onUpdate, onCancel }: VariantGridProps) {
  // Group by concept
  const concepts: Record<number, GeneratedAd[]> = {};
  for (const ad of ads) {
    if (!concepts[ad.concept_number]) concepts[ad.concept_number] = [];
    concepts[ad.concept_number].push(ad);
  }

  async function handleToggleSelect(genId: string) {
    try {
      await axios.post(`/api/brands/${brandId}/generated/${genId}/select`);
      onUpdate();
    } catch {
      toast.error("Failed to toggle selection");
    }
  }

  async function handleRegenerate(genId: string) {
    try {
      await axios.post(`/api/brands/${brandId}/generated/${genId}/regenerate`);
      toast.success("Regeneration queued");
      onUpdate();
    } catch {
      toast.error("Failed to regenerate");
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Generated Images</h2>
          <p className="text-sm text-muted-foreground">
            {ads.filter((a) => a.is_selected).length} selected for compositing
          </p>
        </div>
      </div>

      {isProcessing && progress && (
        <div className="max-w-md mx-auto space-y-3">
          <ProgressTracker
            total={progress.items_total}
            processed={progress.items_processed}
            failed={progress.items_failed}
            currentItem={progress.current_item}
            label="Generating images..."
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
      )}

      {/* 4-column grid (one per concept) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((conceptNum) => (
          <div key={conceptNum} className="space-y-2">
            <Badge variant="outline" className="mb-2">Concept {conceptNum}</Badge>
            {(concepts[conceptNum] || []).map((ad) => (
              <VariantCard
                key={ad.id}
                ad={ad}
                onSelect={() => handleToggleSelect(ad.id)}
                onRegenerate={() => handleRegenerate(ad.id)}
              />
            ))}
            {(!concepts[conceptNum] || concepts[conceptNum].length === 0) && (
              <div className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  ad,
  onSelect,
  onRegenerate,
}: {
  ad: GeneratedAd;
  onSelect: () => void;
  onRegenerate: () => void;
}) {
  if (ad.generation_status === "generating" || ad.generation_status === "pending") {
    return (
      <div className="aspect-square rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-2 animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {ad.generation_status === "generating" ? "Generating..." : "Queued"}
        </span>
      </div>
    );
  }

  if (ad.generation_status === "failed") {
    return (
      <div className="aspect-square rounded-lg border border-destructive/50 bg-destructive/5 flex flex-col items-center justify-center gap-2">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span className="text-xs text-destructive">Failed</span>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all",
        ad.is_selected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50"
      )}
    >
      {ad.raw_image_url && (
        <Image
          src={ad.raw_image_url}
          alt={`Concept ${ad.concept_number} Variant ${ad.variant_number}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      )}

      {/* Selection indicator — always visible */}
      <div
        className={cn(
          "absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
          ad.is_selected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background/80 border-muted-foreground/40"
        )}
      >
        {ad.is_selected && <Check className="h-4 w-4" />}
      </div>

      {/* Regenerate button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded bg-background/80"
      >
        <RefreshCw className="h-3 w-3" />
      </button>

      {/* Variant label */}
      <div className="absolute bottom-2 left-2">
        <Badge variant="secondary" className="text-[10px]">V{ad.variant_number}</Badge>
      </div>
    </div>
  );
}
