import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, notFoundResponse, errorResponse } from "@/lib/api/response";
import { timingSafeCompare, hashPassword } from "@/lib/api/password";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;
  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  const supabase = createAdminClient();

  const { data: gallery } = await supabase
    .from("shared_galleries")
    .select("*")
    .eq("share_token", shareToken)
    .eq("is_active", true)
    .single();

  if (!gallery) return notFoundResponse("Gallery");

  // Compare hashed password using timing-safe comparison
  const inputHash = await hashPassword(password);
  if (!timingSafeCompare(gallery.password_hash, inputHash)) {
    return errorResponse("INVALID_PASSWORD", "Incorrect password", 401);
  }

  // Increment view count
  await supabase
    .from("shared_galleries")
    .update({ view_count: (gallery.view_count || 0) + 1 })
    .eq("id", gallery.id);

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
  });
}
