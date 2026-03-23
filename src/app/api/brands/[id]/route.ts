import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationError,
} from "@/lib/api/response";
import { updateBrandSchema } from "@/lib/validation/brand";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Brand");

  // Get ad count
  const { count: adCount } = await supabase
    .from("ad_library_ads")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", id);

  // Get active job
  const { data: activeJob } = await supabase
    .from("pipeline_jobs")
    .select("id, stage, status, progress")
    .eq("brand_id", id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return successResponse({
    ...data,
    ad_count: adCount || 0,
    active_job: activeJob || null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateBrandSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const supabase = await createClient();

  // If brand_dna is being updated, increment version
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.brand_dna) {
    const { data: current } = await supabase
      .from("brands")
      .select("brand_dna_version")
      .eq("id", id)
      .single();
    updateData.brand_dna_version = (current?.brand_dna_version || 0) + 1;
  }

  const { data, error } = await supabase
    .from("brands")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Brand");

  return successResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // Soft delete
  const { data, error } = await supabase
    .from("brands")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Brand");

  return successResponse(data);
}
