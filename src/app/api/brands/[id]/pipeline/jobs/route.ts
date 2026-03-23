import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipeline_jobs")
    .select("*")
    .eq("brand_id", id)
    .order("created_at", { ascending: false });

  return successResponse(data || []);
}
