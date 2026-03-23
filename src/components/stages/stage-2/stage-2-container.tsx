"use client";

import { useState } from "react";
import axios from "axios";
import { Dna, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { ScrapeProgress } from "../stage-1/scrape-progress";
import { BrandDNAEditor } from "./brand-dna-editor";
import { toast } from "sonner";

export function Stage2Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[2];
  const [isRunning, setIsRunning] = useState(false);
  const [model, setModel] = useState<AIModel>("gemini-2.5-pro");

  useRealtimeJob(activeJobId);

  if (!activeBrand) return null;

  async function handleRunDNA() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(2, { status: "processing", jobId: null, progress: null });

    try {
      // Try to create pipeline job, or use existing queued one
      let jobId: string;
      try {
        const { data } = await axios.post(
          `/api/brands/${activeBrand.id}/pipeline/2/run`,
          {}
        );
        jobId = data.data.job_id;
      } catch (runErr) {
        // If "already running", find existing job
        const { data: jobsData } = await axios.get(
          `/api/brands/${activeBrand.id}/pipeline/jobs`
        );
        const existingJob = (jobsData.data || []).find(
          (j: { stage: number; status: string }) => j.stage === 2 && (j.status === "queued" || j.status === "processing")
        );
        if (existingJob) {
          jobId = existingJob.id;
        } else {
          throw runErr; // Re-throw if no existing job found
        }
      }

      setActiveJobId(jobId);
      setStageState(2, { status: "processing", jobId });

      // Directly process (bypasses Edge Functions for local dev)
      await axios.post(
        `/api/brands/${activeBrand.id}/pipeline/2/process`,
        { job_id: jobId, model }
      );

      // Refresh brand data
      const brandResp = await axios.get(`/api/brands/${activeBrand.id}`);
      const { updateBrand } = useBrandStore.getState();
      updateBrand(activeBrand.id, brandResp.data.data);

      setStageState(2, { status: "review", jobId });
      toast.success("Brand DNA generated!");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || "Brand DNA generation failed"
        : "Brand DNA generation failed";
      setStageState(2, { status: "failed" });
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCancel() {
    setIsRunning(false);
    setStageState(2, { status: "not_started", jobId: null, progress: null });
    setActiveJobId(null);

    if (activeBrand) {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        await supabase
          .from("brands")
          .update({ current_stage_status: "not_started" })
          .eq("id", activeBrand.id);
        if (activeJobId) {
          await supabase
            .from("pipeline_jobs")
            .update({ status: "cancelled" })
            .eq("id", activeJobId);
        }
      } catch {}
    }
    toast("Generation cancelled");
  }

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      await axios.post(`/api/brands/${activeBrand.id}/pipeline/2/approve`, {});
      setStageState(2, { status: "approved" });
      setStageState(3, { status: "not_started" });
      setCurrentStage(3);
      toast.success("Brand DNA approved — proceed to Ad Library");
    } catch {
      toast.error("Failed to approve");
    }
  }

  // Not started — waiting or manually triggerable
  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Dna className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Brand DNA Generation</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          AI will synthesize your store data into a comprehensive Brand DNA document.
        </p>
        <ModelSelector
          value={model}
          onChange={setModel}
          label="Generate with:"
          allowedModels={["gemini-2.5-pro", "gemini-2.5-flash"]}
        />
        <Button onClick={handleRunDNA} disabled={isRunning} size="lg">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Generate Brand DNA"
          )}
        </Button>
      </div>
    );
  }

  // Processing
  if (stage?.status === "processing") {
    return <ScrapeProgress progress={stage.progress} onCancel={handleCancel} />;
  }

  // Failed
  if (stage?.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-xl font-semibold text-destructive">Generation Failed</h2>
        <p className="text-sm text-muted-foreground">
          Brand DNA generation encountered an error.
        </p>
        <Button onClick={handleRunDNA}>Retry</Button>
      </div>
    );
  }

  // Review or approved — show editor
  return (
    <>
      <BrandDNAEditor />
      {stage?.status === "review" && (
        <ApprovalBar
          stageName="Stage 2: Brand DNA"
          status="review"
          onApprove={handleApprove}
          onRerun={handleRunDNA}
        />
      )}
    </>
  );
}
