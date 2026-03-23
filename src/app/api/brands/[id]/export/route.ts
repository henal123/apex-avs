import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api/response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // Get selected ads with final images
  const { data: ads } = await supabase
    .from("generated_ads")
    .select("*")
    .eq("brand_id", id)
    .eq("is_selected", true)
    .order("concept_number")
    .order("variant_number");

  if (!ads || ads.length === 0) {
    return errorResponse("NO_ADS", "No selected ads to export");
  }

  // Collect download URLs
  const exportItems = ads.map((ad) => ({
    concept: ad.concept_number,
    variant: ad.variant_number,
    image_url: ad.final_image_url || ad.raw_image_url,
    prompt: ad.prompt_text,
  }));

  // In production, this would create a ZIP file and upload to exports bucket
  // For now, return the list of URLs for client-side download
  return successResponse({
    brand_id: id,
    items: exportItems,
    total: exportItems.length,
    exported_at: new Date().toISOString(),
  });
}
