import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";
import { approveStageSchema } from "@/lib/validation/pipeline";

// Stages that auto-trigger the next stage after approval
// Stages 4, 5, 6 removed — user picks model before starting those
const AUTO_TRIGGER_STAGES = [1, 2];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id, stage: stageStr } = await params;
  const stageNum = parseInt(stageStr, 10);

  const body = await request.json().catch(() => ({}));
  const parsed = approveStageSchema.safeParse(body);
  const feedback = parsed.success ? parsed.data.feedback : "";

  const supabase = await createClient();

  // Verify brand is in review state for this stage
  const { data: brand } = await supabase
    .from("brands")
    .select("id, pipeline_status, current_stage_status")
    .eq("id", id)
    .single();

  if (!brand) {
    return errorResponse("NOT_FOUND", "Brand not found", 404);
  }

  // Allow approve from multiple states (manual stages, stuck processing, etc.)
  const approvableStates = ["review", "not_started", "processing"];
  if (!approvableStates.includes(brand.current_stage_status)) {
    return errorResponse(
      "INVALID_STATE",
      `Stage cannot be approved from "${brand.current_stage_status}" state`
    );
  }

  // Create approval record
  await supabase.from("stage_approvals").insert({
    brand_id: id,
    stage: stageNum,
    action: "approved",
    feedback,
    approved_by: user.id,
  });

  // Advance pipeline
  const nextStage = stageNum + 1;
  const isComplete = stageNum === 9;

  await supabase
    .from("brands")
    .update({
      pipeline_status: isComplete ? "complete" : `stage_${nextStage}`,
      current_stage_status: isComplete ? "approved" : "not_started",
    })
    .eq("id", id);

  // Auto-trigger next stage if applicable
  let nextJobId = null;
  if (!isComplete && AUTO_TRIGGER_STAGES.includes(stageNum)) {
    const { data: nextJob } = await supabase
      .from("pipeline_jobs")
      .insert({
        brand_id: id,
        stage: nextStage,
        status: "queued",
      })
      .select("id")
      .single();

    if (nextJob) {
      nextJobId = nextJob.id;
      await supabase
        .from("brands")
        .update({ current_stage_status: "processing" })
        .eq("id", id);
    }
  }

  return successResponse({
    approved: true,
    next_stage: isComplete ? null : nextStage,
    next_job_id: nextJobId,
  });
}
