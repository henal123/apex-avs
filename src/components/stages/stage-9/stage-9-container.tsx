"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { Download, Share2, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { ApprovalBar } from "@/components/common/approval-bar";
import { GalleryCreateModal } from "./gallery-create-modal";
import { toast } from "sonner";
import type { GeneratedAd, QACheck } from "@/types/generation";
import type { ApiResponse } from "@/types/api";

export function Stage9Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState } = usePipelineStore();
  const stage = stages[9];
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  const brandId = activeBrand?.id;
  const { data } = useQuery({
    queryKey: ["final-ads", brandId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<GeneratedAd[]>>(
        `/api/brands/${brandId}/generated`
      );
      return data.data.filter((a) => a.is_selected);
    },
    enabled: !!brandId,
  });

  const selectedAds = data || [];

  async function handleExport() {
    if (!brandId) return;
    try {
      const { data } = await axios.post(`/api/brands/${brandId}/export`);
      const items = data.data.items as Array<{ image_url: string; concept: number; variant: number }>;
      // Download each image
      for (const item of items) {
        if (item.image_url) {
          const link = document.createElement("a");
          link.href = item.image_url;
          link.download = `concept_${item.concept}_v${item.variant}.jpg`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      toast.success(`${items.length} images exported`);
    } catch {
      toast.error("Export failed");
    }
  }

  async function handleFinalApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/9/approve`, {});
      setStageState(9, { status: "approved" });
      toast.success("Pipeline complete! All stages approved.");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (!activeBrand) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Export & Delivery</h2>
          <p className="text-sm text-muted-foreground">
            {selectedAds.length} final ad creatives ready
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGalleryModal(true)}>
            <Share2 className="h-4 w-4 mr-1" />
            Share Gallery
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Download All
          </Button>
        </div>
      </div>

      {/* QA results + final grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {selectedAds.map((ad) => (
          <div key={ad.id} className="space-y-2">
            <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
              <Image
                src={ad.final_image_url || ad.raw_image_url || ""}
                alt={`C${ad.concept_number} V${ad.variant_number}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
              <div className="absolute top-2 left-2">
                <Badge variant="secondary">C{ad.concept_number} V{ad.variant_number}</Badge>
              </div>
              {ad.qa_passed !== null && (
                <div className="absolute top-2 right-2">
                  {ad.qa_passed ? (
                    <Badge className="bg-green-500 text-white"><Check className="h-3 w-3 mr-0.5" />QA Pass</Badge>
                  ) : (
                    <Badge variant="destructive"><X className="h-3 w-3 mr-0.5" />QA Fail</Badge>
                  )}
                </div>
              )}
            </div>

            {/* QA checks */}
            {ad.qa_result && (
              <div className="space-y-0.5">
                {(ad.qa_result.checks as QACheck[]).map((check, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    {check.passed ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : check.severity === "error" ? (
                      <X className="h-3 w-3 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    )}
                    <span className="text-muted-foreground">{check.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <GalleryCreateModal
        open={showGalleryModal}
        onOpenChange={setShowGalleryModal}
        brandId={activeBrand.id}
        adIds={selectedAds.map((a) => a.id)}
      />

      {stage?.status === "review" && (
        <ApprovalBar
          stageName="Stage 9: Export"
          status="review"
          onApprove={handleFinalApprove}
        />
      )}
    </div>
  );
}
