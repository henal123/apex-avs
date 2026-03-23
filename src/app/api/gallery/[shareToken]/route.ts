import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, notFoundResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const supabase = createAdminClient();

  // Get gallery (no auth required)
  const { data: gallery, error } = await supabase
    .from("shared_galleries")
    .select("*")
    .eq("share_token", shareToken)
    .eq("is_active", true)
    .single();

  if (error || !gallery) return notFoundResponse("Gallery");

  // Check expiry
  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    return notFoundResponse("Gallery has expired");
  }

  // Check password protection
  if (gallery.is_password_protected) {
    return successResponse({
      id: gallery.id,
      title: gallery.title,
      requires_password: true,
    });
  }

  // Increment view count
  await supabase
    .from("shared_galleries")
    .update({ view_count: (gallery.view_count || 0) + 1 })
    .eq("id", gallery.id);

  // Get the selected ads
  const { data: ads } = await supabase
    .from("generated_ads")
    .select("id, concept_number, variant_number, raw_image_url, final_image_url, prompt_text")
    .in("id", gallery.selected_ad_ids || [])
    .order("concept_number")
    .order("variant_number");

  return successResponse({
    id: gallery.id,
    title: gallery.title,
    description: gallery.description,
    ads: ads || [],
    view_count: gallery.view_count + 1,
  });
}
