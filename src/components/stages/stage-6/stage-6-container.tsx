"use client";

import { useState } from "react";
import axios from "axios";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { useStageCancelHandler } from "@/hooks/use-stage-cancel";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { ScrapeProgress } from "../stage-1/scrape-progress";
import { ConceptCardsGrid } from "./concept-cards-grid";
import { toast } from "sonner";

export function Stage6Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[6];
  const [model, setModel] = useState<AIModel>("gemini-2.5-pro");
  const [isRunning, setIsRunning] = useState(false);

  useRealtimeJob(activeJobId);
  const handleCancel = useStageCancelHandler(6);

  if (!activeBrand) return null;

  async function handleRun() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(6, { status: "processing", jobId: null, progress: null });

    try {
      const { data } = await axios.post(`/api/brands/${activeBrand.id}/pipeline/6/run`, {});
      const jobId = data.data.job_id;
      setActiveJobId(jobId);
      setStageState(6, { status: "processing", jobId });

      await axios.post(`/api/brands/${activeBrand.id}/pipeline/6/process`, { job_id: jobId, model });
      const brandResp = await axios.get(`/api/brands/${activeBrand.id}`);
      useBrandStore.getState().updateBrand(activeBrand.id, brandResp.data.data);
      setStageState(6, { status: "review", jobId });
      toast.success("Concepts generated!");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
      setStageState(6, { status: "failed" });
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/6/approve`, {});
      setStageState(6, { status: "approved" });
      setStageState(7, { status: "not_started" });
      setCurrentStage(7);
      toast.success("Concepts approved — proceed to Image Generation");
    } catch {
      toast.error("Failed to approve");
    }
  }

  if (stage?.status === "processing") {
    return <ScrapeProgress progress={stage.progress} onCancel={handleCancel} />;
  }

  if (stage?.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-xl font-semibold text-destructive">Concept Generation Failed</h2>
        <Button onClick={handleRun}>Retry</Button>
      </div>
    );
  }

  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Wand2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Concept Generation</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          AI will generate 4 detailed ad concept specifications with image generation prompts.
        </p>
        <ModelSelector
          value={model}
          onChange={setModel}
          label="Generate with:"
          allowedModels={["gemini-2.5-pro", "gemini-2.5-flash", "claude-sonnet"]}
        />
        <Button onClick={handleRun} disabled={isRunning} size="lg">
          {isRunning ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
          ) : (
            "Generate Ad Concepts"
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ConceptCardsGrid />
      {stage?.status === "review" && (
        <ApprovalBar stageName="Stage 6: Concepts" status="review" onApprove={handleApprove} />
      )}
    </>
  );
}
