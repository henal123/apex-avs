"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { useStageCancelHandler } from "@/hooks/use-stage-cancel";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { AnalysisProgress } from "./analysis-progress";
import { AnalysisDashboard } from "./analysis-dashboard";
import { toast } from "sonner";
import type { AdLibraryAd } from "@/types/ad-library";
import type { ApiResponse } from "@/types/api";

export function Stage4Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[4];
  const [model, setModel] = useState<AIModel>("gemini-2.5-flash");
  const [isRunning, setIsRunning] = useState(false);
  const processingStarted = useRef(false);

  useRealtimeJob(activeJobId);
  const handleCancel = useStageCancelHandler(4);

  const brandId = activeBrand?.id;
  const isProcessing = stage?.status === "processing";

  const { data: adsData, refetch } = useQuery({
    queryKey: ["ads-analysis", brandId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<AdLibraryAd[]>>(
        `/api/brands/${brandId}/ads?limit=200`
      );
      return data.data;
    },
    enabled: !!brandId,
    refetchInterval: isProcessing ? 3000 : false,
  });

  const ads = adsData || [];
  const totalAds = ads.length;
  const completedAds = ads.filter((a) => a.analysis_status === "complete").length;
  const failedAds = ads.filter((a) => a.analysis_status === "failed").length;
  const liveProgress = totalAds > 0 && isProcessing
    ? {
        items_total: totalAds,
        items_processed: completedAds,
        items_failed: failedAds,
        current_item: completedAds < totalAds ? `Analyzing ad ${completedAds + 1}/${totalAds}...` : null,
        percent: Math.round((completedAds / totalAds) * 100),
      }
    : stage?.progress;

  async function handleRun() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(4, { status: "processing", jobId: null, progress: null });

    try {
      const { data } = await axios.post(`/api/brands/${activeBrand.id}/pipeline/4/run`, {});
      const jobId = data.data.job_id;
      setActiveJobId(jobId);
      setStageState(4, { status: "processing", jobId });

      // Fire and forget — UI polls ads for progress
      axios.post(`/api/brands/${activeBrand.id}/pipeline/4/process`, { job_id: jobId, model })
        .then(() => {
          axios.get(`/api/brands/${activeBrand.id}`).then((resp) => {
            useBrandStore.getState().updateBrand(activeBrand.id, resp.data.data);
          });
          setStageState(4, { status: "review", jobId });
          toast.success("Analysis complete!");
        })
        .catch((err) => {
          const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
          setStageState(4, { status: "failed" });
          toast.error(msg);
        })
        .finally(() => setIsRunning(false));
    } catch {
      setStageState(4, { status: "failed" });
      setIsRunning(false);
    }
  }

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/4/approve`, {});
      setStageState(4, { status: "approved" });
      setStageState(5, { status: "not_started" });
      setCurrentStage(5);
      toast.success("Analysis approved — proceed to Intelligence");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (!activeBrand) return null;

  // Not started — show model selector + start button
  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <BarChart3 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">AI Analysis</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          AI will analyze {totalAds || "all"} ads across 50+ dimensions including layout, typography, color, and persuasion mechanics.
        </p>
        <ModelSelector
          value={model}
          onChange={setModel}
          label="Analyze with:"
          allowedModels={["gemini-2.5-flash", "gemini-2.5-pro"]}
        />
        <Button onClick={handleRun} disabled={isRunning} size="lg">
          {isRunning ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</>
          ) : (
            `Analyze ${totalAds || ""} Ads`
          )}
        </Button>
      </div>
    );
  }

  // Processing
  if (isProcessing) {
    return (
      <AnalysisProgress
        ads={ads}
        progress={liveProgress}
        onCancel={handleCancel}
      />
    );
  }

  // Failed
  if (stage?.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-xl font-semibold text-destructive">Analysis Failed</h2>
        <Button onClick={handleRun}>Retry</Button>
      </div>
    );
  }

  // Review or approved
  return (
    <>
      <AnalysisDashboard ads={ads} brandId={activeBrand.id} onUpdate={refetch} />
      {stage?.status === "review" && (
        <ApprovalBar stageName="Stage 4: AI Analysis" status="review" onApprove={handleApprove} />
      )}
    </>
  );
}
