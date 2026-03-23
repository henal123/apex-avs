import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, notFoundResponse, errorResponse } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id, genId } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Save compositing spec
  const { data, error } = await supabase
    .from("generated_ads")
    .update({
      compositing_spec: body.compositing_spec,
      // For now, final_image_url = raw_image_url (Sharp compositing TBD)
      final_image_url: body.final_image_url || null,
      composited_at: new Date().toISOString(),
    })
    .eq("id", genId)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Generated ad");
  return successResponse(data);
}
