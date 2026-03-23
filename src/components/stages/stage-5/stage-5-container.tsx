"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { useStageCancelHandler } from "@/hooks/use-stage-cancel";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { ScrapeProgress } from "../stage-1/scrape-progress";
import { ReportDashboard } from "./report-dashboard";
import { toast } from "sonner";

export function Stage5Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[5];
  const [model, setModel] = useState<AIModel>("gemini-2.5-pro");
  const [isRunning, setIsRunning] = useState(false);

  useRealtimeJob(activeJobId);
  const handleCancel = useStageCancelHandler(5);

  if (!activeBrand) return null;

  async function handleRun() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(5, { status: "processing", jobId: null, progress: null });

    try {
      const { data } = await axios.post(`/api/brands/${activeBrand.id}/pipeline/5/run`, {});
      const jobId = data.data.job_id;
      setActiveJobId(jobId);
      setStageState(5, { status: "processing", jobId });

      await axios.post(`/api/brands/${activeBrand.id}/pipeline/5/process`, { job_id: jobId, model });
      const brandResp = await axios.get(`/api/brands/${activeBrand.id}`);
      useBrandStore.getState().updateBrand(activeBrand.id, brandResp.data.data);
      setStageState(5, { status: "review", jobId });
      toast.success("Intelligence report generated!");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
      setStageState(5, { status: "failed" });
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/5/approve`, {});
      setStageState(5, { status: "approved" });
      setStageState(6, { status: "not_started" });
      setCurrentStage(6);
      toast.success("Intelligence approved — proceed to Concepts");
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
        <h2 className="text-xl font-semibold text-destructive">Synthesis Failed</h2>
        <p className="text-sm text-muted-foreground">Intelligence report generation failed.</p>
        <Button onClick={handleRun}>Retry</Button>
      </div>
    );
  }

  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Brain className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Intelligence Synthesis</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          AI will synthesize all ad analyses into a strategic intelligence report with concept directions.
        </p>
        <ModelSelector
          value={model}
          onChange={setModel}
          label="Generate with:"
          allowedModels={["gemini-2.5-pro", "gemini-2.5-flash"]}
        />
        <Button onClick={handleRun} disabled={isRunning} size="lg">
          {isRunning ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
          ) : (
            "Generate Intelligence Report"
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ReportDashboard />
      {stage?.status === "review" && (
        <ApprovalBar stageName="Stage 5: Intelligence" status="review" onApprove={handleApprove} />
      )}
    </>
  );
}
