import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { genId } = await params;
  const supabase = await createClient();

  // Toggle selection
  const { data: current } = await supabase
    .from("generated_ads")
    .select("is_selected")
    .eq("id", genId)
    .single();

  if (!current) return notFoundResponse("Generated ad");

  const { data } = await supabase
    .from("generated_ads")
    .update({ is_selected: !current.is_selected })
    .eq("id", genId)
    .select()
    .single();

  return successResponse(data);
}
