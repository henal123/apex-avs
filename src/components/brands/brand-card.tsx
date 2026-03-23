"use client";

import Link from "next/link";
import { Store, Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Brand } from "@/types/brand";
import { STAGE_NAMES } from "@/types/pipeline";

interface BrandCardProps {
  brand: Brand;
}

function getPipelineStageNumber(status: string): number {
  if (status === "complete") return 9;
  const match = status.match(/stage_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export function BrandCard({ brand }: BrandCardProps) {
  const stageNum = getPipelineStageNumber(brand.pipeline_status);
  const progress = brand.pipeline_status === "complete" ? 100 : Math.round(((stageNum - 1) / 9) * 100);

  return (
    <Link href={`/brands/${brand.slug}`}>
      <Card className="group cursor-pointer rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-card">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                  {brand.brand_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {brand.store_url}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs rounded-full">
              {brand.category}
            </Badge>
          </div>

          {/* Pipeline progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {brand.pipeline_status === "complete"
                  ? "Complete"
                  : `Stage ${stageNum}: ${STAGE_NAMES[stageNum] || ""}`}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {progress}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/40 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(brand.last_activity_at).toLocaleDateString()}
            </div>
            {brand.ad_count !== undefined && brand.ad_count > 0 && (
              <span>{brand.ad_count} ads</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
