"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { useStageCancelHandler } from "@/hooks/use-stage-cancel";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { VariantGrid } from "./variant-grid";
import { toast } from "sonner";
import type { GeneratedAd } from "@/types/generation";
import type { ApiResponse } from "@/types/api";

export function Stage7Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[7];
  const [model, setModel] = useState<AIModel>("gemini-2.5-flash");
  const [isRunning, setIsRunning] = useState(false);

  useRealtimeJob(activeJobId);
  const handleCancel = useStageCancelHandler(7);

  const brandId = activeBrand?.id;
  const isProcessing = stage?.status === "processing";

  const { data, refetch } = useQuery({
    queryKey: ["generated-ads", brandId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<GeneratedAd[]>>(
        `/api/brands/${brandId}/generated`
      );
      return data.data;
    },
    enabled: !!brandId,
    refetchInterval: isProcessing ? 3000 : false,
  });

  const ads = data || [];
  const selectedCount = ads.filter((a) => a.is_selected).length;

  async function handleRun() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(7, { status: "processing", jobId: null, progress: null });

    try {
      const { data } = await axios.post(`/api/brands/${activeBrand.id}/pipeline/7/run`, { config: { model } });
      const jobId = data.data.job_id;
      setActiveJobId(jobId);
      setStageState(7, { status: "processing", jobId });

      // Fire and forget with long timeout — UI polls generated_ads for progress
      axios.post(`/api/brands/${activeBrand.id}/pipeline/7/process`, { job_id: jobId, model }, { timeout: 600000 })
        .then(() => {
          refetch();
          setStageState(7, { status: "review", jobId });
          toast.success("Images generated!");
        })
        .catch((err) => {
          const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
          setStageState(7, { status: "failed" });
          toast.error(msg);
        })
        .finally(() => setIsRunning(false));
    } catch {
      setStageState(7, { status: "failed" });
      setIsRunning(false);
    }
  }

  async function handleApprove() {
    if (!activeBrand) return;
    if (selectedCount === 0) {
      toast.error("Select at least one variant");
      return;
    }
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/7/approve`, {});
      setStageState(7, { status: "approved" });
      setStageState(8, { status: "not_started" });
      setCurrentStage(8);
      toast.success("Images approved — proceed to compositing");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (!activeBrand) return null;

  // Not started — show start button with model selector
  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <ImageIcon className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Image Generation</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          AI will generate 3 image variants for each of the 4 concepts (12 total).
        </p>
        <ModelSelector
          value={model}
          onChange={setModel}
          label="Generate with:"
          allowedModels={["gemini-2.5-flash", "gemini-2.5-pro"]}
        />
        <Button onClick={handleRun} disabled={isRunning} size="lg">
          {isRunning ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</>
          ) : (
            "Generate 12 Images"
          )}
        </Button>
      </div>
    );
  }

  // Failed
  if (stage?.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-xl font-semibold text-destructive">Image Generation Failed</h2>
        <Button onClick={handleRun}>Retry</Button>
      </div>
    );
  }

  return (
    <>
      <VariantGrid
        ads={ads}
        brandId={activeBrand.id}
        isProcessing={isProcessing}
        progress={stage?.progress}
        onUpdate={refetch}
        onCancel={handleCancel}
      />
      {stage?.status === "review" && (
        <ApprovalBar stageName="Stage 7: Image Generation" status="review" onApprove={handleApprove} />
      )}
    </>
  );
}
