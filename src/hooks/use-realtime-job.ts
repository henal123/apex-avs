"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePipelineStore } from "@/stores/pipeline-store";
import type { PipelineJob } from "@/types/pipeline";

export function useRealtimeJob(jobId: string | null) {
  const { updateProgress, setStageState, currentStage } = usePipelineStore();

  useEffect(() => {
    if (!jobId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pipeline_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const job = payload.new as unknown as PipelineJob;

          if (job.progress) {
            updateProgress(job.progress);
          }

          if (job.status === "complete") {
            setStageState(currentStage, { status: "review" });
          } else if (job.status === "failed") {
            setStageState(currentStage, { status: "failed" });
          } else if (job.status === "processing") {
            setStageState(currentStage, { status: "processing" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, currentStage, updateProgress, setStageState]);
}
