"use client";

import { usePipelineStore } from "@/stores/pipeline-store";
import { useBrandStore } from "@/stores/brand-store";
import { toast } from "sonner";

export function useStageCancelHandler(stageNum: number) {
  const { setStageState, setActiveJobId, activeJobId } = usePipelineStore();
  const { activeBrand } = useBrandStore();

  async function handleCancel() {
    setStageState(stageNum, { status: "not_started", jobId: null, progress: null });
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
    toast("Cancelled");
  }

  return handleCancel;
}
