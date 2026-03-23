import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationError,
} from "@/lib/api/response";
import { updateAdSchema } from "@/lib/validation/ad-library";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { adId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_library_ads")
    .select("*")
    .eq("id", adId)
    .single();

  if (error || !data) return notFoundResponse("Ad");
  return successResponse(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { adId } = await params;
  const body = await request.json();
  const parsed = updateAdSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error.flatten());

  const supabase = await createClient();

  // Track edits
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.analysis) {
    updateData.user_edited = true;
  }

  const { data, error } = await supabase
    .from("ad_library_ads")
    .update(updateData)
    .eq("id", adId)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Ad");
  return successResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { adId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("ad_library_ads")
    .delete()
    .eq("id", adId);

  if (error) return notFoundResponse("Ad");
  return successResponse({ deleted: true });
}
