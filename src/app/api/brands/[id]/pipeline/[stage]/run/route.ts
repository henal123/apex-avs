import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";
import { runStageSchema } from "@/lib/validation/pipeline";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id, stage: stageStr } = await params;
  const stageNum = parseInt(stageStr, 10);

  if (isNaN(stageNum) || stageNum < 1 || stageNum > 9) {
    return errorResponse("INVALID_STAGE", "Stage must be between 1 and 9");
  }

  const body = await request.json().catch(() => ({}));
  const parsed = runStageSchema.safeParse(body);
  const config = parsed.success ? parsed.data.config : {};

  const supabase = await createClient();

  // Verify brand exists
  const { data: brand } = await supabase
    .from("brands")
    .select("id, pipeline_status, current_stage_status")
    .eq("id", id)
    .single();

  if (!brand) {
    return errorResponse("NOT_FOUND", "Brand not found", 404);
  }

  // Check no active job for this stage
  const { data: activeJob } = await supabase
    .from("pipeline_jobs")
    .select("id")
    .eq("brand_id", id)
    .eq("stage", stageNum)
    .in("status", ["queued", "processing"])
    .maybeSingle();

  if (activeJob) {
    // Cancel the stale queued/processing job and create a fresh one
    await supabase
      .from("pipeline_jobs")
      .update({ status: "cancelled" })
      .eq("id", activeJob.id);
  }

  // Create pipeline job
  const { data: job, error } = await supabase
    .from("pipeline_jobs")
    .insert({
      brand_id: id,
      stage: stageNum,
      status: "queued",
      config,
    })
    .select()
    .single();

  if (error) {
    return errorResponse("CREATE_FAILED", error.message, 500);
  }

  // Update brand status
  await supabase
    .from("brands")
    .update({
      pipeline_status: `stage_${stageNum}`,
      current_stage_status: "processing",
    })
    .eq("id", id);

  return successResponse({ job_id: job.id }, undefined, 201);
}
