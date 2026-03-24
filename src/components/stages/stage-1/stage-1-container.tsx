"use client";

import { useState } from "react";
import axios from "axios";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { useRealtimeJob } from "@/hooks/use-realtime-job";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ScrapeProgress } from "./scrape-progress";
import { ScrapeResults } from "./scrape-results";
import { toast } from "sonner";

export function Stage1Container() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setActiveJobId, activeJobId, setCurrentStage } = usePipelineStore();
  const stage = stages[1];
  const [isRunning, setIsRunning] = useState(false);

  useRealtimeJob(activeJobId);

  if (!activeBrand) return null;

  async function handleRunScrape() {
    if (!activeBrand) return;
    setIsRunning(true);
    setStageState(1, { status: "processing", jobId: null, progress: null });

    try {
      // Create the pipeline job
      const { data } = await axios.post(
        `/api/brands/${activeBrand.id}/pipeline/1/run`,
        {}
      );
      const jobId = data.data.job_id;
      setActiveJobId(jobId);
      setStageState(1, { status: "processing", jobId });

      // Directly process the scrape (bypasses Edge Functions for local dev)
      const result = await axios.post(
        `/api/brands/${activeBrand.id}/pipeline/1/process`,
        { job_id: jobId }
      );

      // Scrape complete — refresh brand data and go to review
      const brandResp = await axios.get(`/api/brands/${activeBrand.id}`);
      const { updateBrand } = useBrandStore.getState();
      updateBrand(activeBrand.id, brandResp.data.data);

      setStageState(1, { status: "review", jobId });
      toast.success("Scraping complete!");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || "Scrape failed"
        : "Scrape failed";
      setStageState(1, { status: "failed" });
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCancel() {
    setIsRunning(false);
    setStageState(1, { status: "not_started", jobId: null, progress: null });
    setActiveJobId(null);

    // Reset brand stage status in DB so reload doesn't restart processing
    if (activeBrand) {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        await supabase
          .from("brands")
          .update({ current_stage_status: "not_started" })
          .eq("id", activeBrand.id);

        // Cancel the active job in DB
        if (activeJobId) {
          await supabase
            .from("pipeline_jobs")
            .update({ status: "cancelled" })
            .eq("id", activeJobId);
        }
      } catch (err) {
        console.error("Failed to cancel scrape:", err);
      }
    }

    toast("Scrape cancelled");
  }

  async function handleApprove() {
    if (!activeBrand) return;
    try {
      const { data } = await axios.post(
        `/api/brands/${activeBrand.id}/pipeline/1/approve`,
        {}
      );
      setStageState(1, { status: "approved" });
      setCurrentStage(2);
      if (data.data.next_job_id) {
        setActiveJobId(data.data.next_job_id);
        setStageState(2, { status: "processing", jobId: data.data.next_job_id });
      }
      toast.success("Stage 1 approved — Brand DNA generation started");
    } catch {
      toast.error("Failed to approve stage");
    }
  }

  async function handleRerun() {
    setStageState(1, { status: "not_started", jobId: null, progress: null });
    handleRunScrape();
  }

  // Initial state — ready to scrape
  if (stage?.status === "not_started") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Globe className="h-20 w-20 text-muted-foreground/50" />
        <h2 className="text-2xl font-light tracking-tight">Store Scraping</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Extract products, branding, colors, and metadata from{" "}
          <span className="font-medium text-foreground">
            {activeBrand.store_url}
          </span>
        </p>
        <Button onClick={handleRunScrape} disabled={isRunning} size="lg" className="rounded-xl h-12">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Scrape Store"
          )}
        </Button>
      </div>
    );
  }

  // Processing state
  if (stage?.status === "processing") {
    return <ScrapeProgress progress={stage.progress} onCancel={handleCancel} />;
  }

  // Failed state
  if (stage?.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 className="text-2xl font-light tracking-tight text-destructive">Scrape Failed</h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong during scraping. Please try again.
        </p>
        <Button onClick={handleRerun} className="rounded-xl h-12">Retry Scrape</Button>
      </div>
    );
  }

  // Review or approved state — show results
  return (
    <>
      <ScrapeResults />
      {stage?.status === "review" && (
        <ApprovalBar
          stageName="Stage 1: Store Scraping"
          status="review"
          onApprove={handleApprove}
          onRerun={handleRerun}
        />
      )}
    </>
  );
}
