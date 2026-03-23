import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { genId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    generation_status: "pending",
    raw_image_url: null,
    generated_at: null,
    error_message: null,
  };

  if (body.prompt_text) updateData.prompt_text = body.prompt_text;
  if (body.model) updateData.model_used = body.model;
  if (body.seed) updateData.seed = body.seed;
  else updateData.seed = Math.floor(Math.random() * 999999);

  const { data, error } = await supabase
    .from("generated_ads")
    .update(updateData)
    .eq("id", genId)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Generated ad");
  return successResponse(data);
}
