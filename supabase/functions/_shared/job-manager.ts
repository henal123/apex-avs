import { getSupabaseAdmin } from "./supabase-client.ts";

interface JobProgress {
  items_total: number;
  items_processed: number;
  items_failed: number;
  current_item: string | null;
  percent: number;
}

export async function startJob(jobId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("pipeline_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function updateJobProgress(jobId: string, progress: JobProgress) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("pipeline_jobs")
    .update({ progress })
    .eq("id", jobId);
}

export async function completeJob(jobId: string, result?: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("pipeline_jobs")
    .update({
      status: "complete",
      completed_at: new Date().toISOString(),
      result: result ?? null,
    })
    .eq("id", jobId);
}

export async function failJob(jobId: string, errorMessage: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("pipeline_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("id", jobId);
}

export async function updateBrandStageStatus(
  brandId: string,
  status: string
) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("brands")
    .update({ current_stage_status: status })
    .eq("id", brandId);
}
