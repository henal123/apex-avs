import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api/response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { adId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_library_ads")
    .update({
      analysis_status: "pending",
      analysis: null,
      analyzed_at: null,
    })
    .eq("id", adId)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Ad");
  return successResponse(data);
}
