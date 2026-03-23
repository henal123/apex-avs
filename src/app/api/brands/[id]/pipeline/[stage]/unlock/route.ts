import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";
import { unlockStageSchema } from "@/lib/validation/pipeline";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id, stage: stageStr } = await params;
  const stageNum = parseInt(stageStr, 10);

  const body = await request.json();
  const parsed = unlockStageSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("CONFIRM_REQUIRED", "Must confirm unlock operation");
  }

  const supabase = await createClient();

  // Cancel any active downstream jobs
  await supabase
    .from("pipeline_jobs")
    .update({ status: "cancelled" })
    .eq("brand_id", id)
    .gt("stage", stageNum)
    .in("status", ["queued", "processing"]);

  // Record the unlock
  await supabase.from("stage_approvals").insert({
    brand_id: id,
    stage: stageNum,
    action: "unlocked",
    feedback: `Stage ${stageNum} unlocked for re-editing. Downstream stages invalidated.`,
    approved_by: user.id,
  });

  // Reset brand pipeline to this stage
  await supabase
    .from("brands")
    .update({
      pipeline_status: `stage_${stageNum}`,
      current_stage_status: "review",
    })
    .eq("id", id);

  return successResponse({
    unlocked: true,
    stage: stageNum,
  });
}
