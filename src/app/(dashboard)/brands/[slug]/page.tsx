"use client";

import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import { StageContainer } from "@/components/pipeline/stage-container";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export default function BrandDetailPage() {
  const { activeBrand } = useBrandStore();
  const { activeJobId } = usePipelineStore();

  useRealtimeJob(activeJobId);

  if (!activeBrand) return null;

  return (
    <div className="space-y-6">
      {/* Brand header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeBrand.brand_name}
          </h1>
          <a
            href={activeBrand.store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {activeBrand.store_url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Badge variant="outline">{activeBrand.category}</Badge>
      </div>

      {/* Pipeline stepper */}
      <div className="rounded-lg border border-border bg-card p-3">
        <PipelineStepper />
      </div>

      {/* Active stage content */}
      <StageContainer />
    </div>
  );
}
