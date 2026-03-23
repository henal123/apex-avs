import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { jobId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipeline_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) return notFoundResponse("Job");

  return successResponse(data);
}
