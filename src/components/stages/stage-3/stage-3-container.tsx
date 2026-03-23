"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useAdLibraryStore } from "@/stores/ad-library-store";
import { ApprovalBar } from "@/components/common/approval-bar";
import { UploadZone } from "./upload-zone";
import { AdGallery } from "./ad-gallery";
import { GalleryFilters } from "./gallery-filters";
import { BulkActionBar } from "./bulk-action-bar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AdLibraryAd } from "@/types/ad-library";
import type { ApiResponse, PaginationMeta } from "@/types/api";

export function Stage3Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setCurrentStage } = usePipelineStore();
  const { ads, setAds, selectedIds } = useAdLibraryStore();
  const stage = stages[3];
  const [filters, setFilters] = useState<Record<string, string>>({});

  const brandId = activeBrand?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads", brandId, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      params.set("limit", "100");
      const { data } = await axios.get<ApiResponse<AdLibraryAd[]> & { meta: PaginationMeta }>(
        `/api/brands/${brandId}/ads?${params.toString()}`
      );
      return data;
    },
    enabled: !!brandId,
  });

  useEffect(() => {
    if (data?.data) setAds(data.data);
  }, [data, setAds]);

  async function handleApprove() {
    if (!activeBrand) return;
    if (ads.length < 1) {
      toast.error("Upload at least 1 ad before continuing");
      return;
    }
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/3/approve`, {});
      setStageState(3, { status: "approved" });
      setStageState(4, { status: "not_started" });
      setCurrentStage(4);
      toast.success("Ad Library approved — proceed to Analysis");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (!activeBrand) return null;

  // Stage 3 is manual — always show approve if we're on this stage
  const isReview = stage?.status === "review" || stage?.status === "not_started" || stage?.status === "processing";

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ad Library</h2>
          <p className="text-sm text-muted-foreground">
            Upload competitor ads and brand creatives for analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{ads.length} ads</Badge>
          {ads.length < 10 && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
              10+ recommended
            </Badge>
          )}
        </div>
      </div>

      {/* Upload */}
      <UploadZone brandId={activeBrand.id} onUploadComplete={refetch} />

      {/* Filters */}
      <GalleryFilters filters={filters} onFiltersChange={setFilters} />

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <BulkActionBar brandId={activeBrand.id} onActionComplete={refetch} />
      )}

      {/* Gallery */}
      <AdGallery ads={ads} isLoading={isLoading} brandId={activeBrand.id} onUpdate={refetch} />

      {/* Approval */}
      {isReview && (
        <ApprovalBar
          stageName="Stage 3: Ad Library"
          status="review"
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
