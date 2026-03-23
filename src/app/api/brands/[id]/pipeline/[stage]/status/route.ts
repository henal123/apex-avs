import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id, stage: stageStr } = await params;
  const stageNum = parseInt(stageStr, 10);

  const supabase = await createClient();

  // Get latest job for this stage
  const { data: job } = await supabase
    .from("pipeline_jobs")
    .select("*")
    .eq("brand_id", id)
    .eq("stage", stageNum)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get approvals for this stage
  const { data: approvals } = await supabase
    .from("stage_approvals")
    .select("*")
    .eq("brand_id", id)
    .eq("stage", stageNum)
    .order("created_at", { ascending: false });

  return successResponse({
    stage: stageNum,
    latest_job: job,
    approvals: approvals || [],
  });
}
