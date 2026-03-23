import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";
import { AIService } from "@/lib/ai/service";
import { getSectionRegeneratePrompt } from "@/prompts/stage2_brand_dna";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const { section_key, additional_context } = await request.json();

  if (!section_key) {
    return errorResponse("MISSING_FIELD", "section_key is required");
  }

  const supabase = await createClient();

  // Get current brand DNA
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna")
    .eq("id", id)
    .single();

  if (!brand?.brand_dna) {
    return errorResponse("NO_DNA", "Brand DNA not found", 404);
  }

  try {
    const prompt = getSectionRegeneratePrompt(
      section_key,
      brand.brand_dna as Record<string, unknown>,
      additional_context || ""
    );

    const result = await AIService.generateBrandDNA(prompt);

    // The result might be the whole section or wrapped
    const sectionData = result.data[section_key] || result.data;

    // Update just this section
    const updatedDNA = {
      ...(brand.brand_dna as Record<string, unknown>),
      [section_key]: sectionData,
    };

    await supabase
      .from("brands")
      .update({ brand_dna: updatedDNA })
      .eq("id", id);

    return successResponse(sectionData);
  } catch (err) {
    return errorResponse(
      "REGENERATION_FAILED",
      (err as Error).message,
      500
    );
  }
}
