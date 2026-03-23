"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Paintbrush, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { ApprovalBar } from "@/components/common/approval-bar";
import { EmptyState } from "@/components/common/empty-state";
import { toast } from "sonner";
import type { GeneratedAd } from "@/types/generation";
import type { ApiResponse } from "@/types/api";

export function Stage8Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState } = usePipelineStore();
  const stage = stages[8];
  const router = useRouter();

  const brandId = activeBrand?.id;
  const { data } = useQuery({
    queryKey: ["selected-ads", brandId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<GeneratedAd[]>>(
        `/api/brands/${brandId}/generated`
      );
      return data.data.filter((a) => a.is_selected);
    },
    enabled: !!brandId,
  });

  const selectedAds = data || [];

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/8/approve`, {});
      setStageState(8, { status: "approved" });
      setStageState(9, { status: "review" });
      toast.success("Compositing approved — proceed to export");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (!activeBrand) return null;

  if (selectedAds.length === 0) {
    return (
      <EmptyState
        icon={<Paintbrush className="h-12 w-12" />}
        title="No images selected for compositing"
        description="Go back to Stage 7 and select variants to composite"
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-lg font-semibold">Text Compositing</h2>
        <p className="text-sm text-muted-foreground">
          Add text overlays and logo to selected images
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {selectedAds.map((ad) => (
          <div key={ad.id} className="space-y-2">
            <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
              <Image
                src={ad.final_image_url || ad.raw_image_url || ""}
                alt={`Concept ${ad.concept_number} V${ad.variant_number}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
              {ad.compositing_spec && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-[10px]">Composited</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                C{ad.concept_number} V{ad.variant_number}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/brands/${activeBrand.slug}/generate/${ad.id}/edit`)
                }
              >
                <Paintbrush className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {stage?.status === "review" && (
        <ApprovalBar
          stageName="Stage 8: Compositing"
          status="review"
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
