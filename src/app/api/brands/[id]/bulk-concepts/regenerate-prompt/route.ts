import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api/response";

export const maxDuration = 60;

/**
 * Analyze a reference ad image and generate a tailored image prompt
 * that replicates its exact visual style for a different product.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id: brandId } = await params;
  const body = await request.json();
  const concept = body.concept;

  if (!concept?.reference_ad_url) {
    return errorResponse("NO_REF", "No reference ad URL provided");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse("NO_KEY", "GEMINI_API_KEY not configured");

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get brand data + intelligence report for context
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna, store_scrape_data, creative_intelligence_report")
    .eq("id", brandId)
    .single();

  const brandDNA = (brand?.brand_dna || {}) as Record<string, unknown>;
  const report = (brand?.creative_intelligence_report || {}) as Record<string, unknown>;
  const visualIdentity = (brandDNA.visual_identity || {}) as Record<string, unknown>;
  const colorPalette = (visualIdentity.color_palette || {}) as Record<string, unknown>;
  const primaryColors = (colorPalette.primary || visualIdentity.primary_colors || []) as Array<Record<string, string> | string>;
  const accentColors = (colorPalette.accent || visualIdentity.accent_colors || []) as Array<Record<string, string> | string>;
  const typography = (visualIdentity.typography || {}) as Record<string, string>;
  const messaging = (brandDNA.messaging_framework || {}) as Record<string, unknown>;
  const adDirectives = (brandDNA.ad_creative_directives || {}) as Record<string, unknown>;
  const negativeSpace = (brandDNA.negative_brand_space || {}) as Record<string, unknown>;
  const storeName = ((brand?.store_scrape_data as Record<string, unknown>)?.store_name as string) || "";
  const winningPatterns = (report.winning_creative_patterns || []) as unknown[];
  const failurePatterns = (report.failure_patterns || []) as unknown[];

  // Get the reference ad's EXISTING analysis from DB (we already analyzed it in Stage 4)
  const { data: refAdRecord } = await supabase
    .from("ad_library_ads")
    .select("analysis, performance_tier, source_type")
    .eq("image_url", concept.reference_ad_url)
    .eq("analysis_status", "complete")
    .maybeSingle();

  const existingAnalysis = (refAdRecord?.analysis || {}) as Record<string, unknown>;

  // Download the reference ad image
  let refImageBase64: string | null = null;
  let refMimeType = "image/jpeg";

  try {
    const resp = await fetch(concept.reference_ad_url);
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      refImageBase64 = Buffer.from(buf).toString("base64");
      refMimeType = resp.headers.get("content-type") || "image/jpeg";
    }
  } catch {}

  // Fallback: admin client
  if (!refImageBase64) {
    try {
      const urlMatch = concept.reference_ad_url.match(/\/public\/([\w-]+)\/(.+)$/);
      if (urlMatch) {
        const { data: fileData } = await adminClient.storage.from(urlMatch[1]).download(decodeURIComponent(urlMatch[2]));
        if (fileData) {
          const buf = await fileData.arrayBuffer();
          refImageBase64 = Buffer.from(buf).toString("base64");
        }
      }
    } catch {}
  }

  if (!refImageBase64) {
    return errorResponse("DOWNLOAD_FAILED", "Could not download reference ad image");
  }

  const colorStr = primaryColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");
  const accentStr = accentColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");

  // Build prompt that uses ANALYSIS DATA as the primary source, reference image as support
  const analysisPrompt = `You are an elite performance marketing creative director. Your job is to write an image generation prompt for a NEW ORIGINAL ad — not a copy of the reference.

=== THE PRODUCT ===
"${concept.product?.name || "Product"}" at $${concept.product?.price || ""}
${concept.product?.description ? `Description: ${concept.product.description}` : ""}

=== BRAND SYSTEM ===
Brand: ${storeName}
Colors: ${colorStr || "dark navy, yellow, red"} | Accent: ${accentStr || ""}
Font: ${typography.primary_font || "Bold sans-serif"} (headlines), ${typography.secondary_font || "Clean sans-serif"} (body)
Tone: ${String(messaging.tone_of_voice || "professional")}

=== INTELLIGENCE FROM AD ANALYSIS (${refAdRecord ? "this reference ad was analyzed" : "general insights"}) ===
${existingAnalysis.archetype ? `Archetype: ${existingAnalysis.archetype}` : ""}
${typeof existingAnalysis.layout_architecture === "string" ? `Layout insight: ${existingAnalysis.layout_architecture}` : ""}
${typeof existingAnalysis.persuasion_mechanics === "string" ? `Persuasion insight: ${existingAnalysis.persuasion_mechanics}` : ""}
${typeof existingAnalysis.typography_analysis === "string" ? `Typography insight: ${existingAnalysis.typography_analysis}` : ""}
${typeof existingAnalysis.color_analysis === "string" ? `Color insight: ${existingAnalysis.color_analysis}` : ""}
${typeof existingAnalysis.product_presentation === "string" ? `Product presentation: ${existingAnalysis.product_presentation}` : ""}
${existingAnalysis.overall_scores ? `Scores: ${JSON.stringify(existingAnalysis.overall_scores)}` : ""}

=== WINNING PATTERNS (from analysis of all ads) ===
${winningPatterns.slice(0, 4).map((p) => typeof p === "string" ? `✓ ${p}` : `✓ ${JSON.stringify(p).slice(0, 120)}`).join("\n")}

=== FAILURE PATTERNS (avoid these) ===
${failurePatterns.slice(0, 3).map((p) => typeof p === "string" ? `✗ ${p}` : `✗ ${JSON.stringify(p).slice(0, 100)}`).join("\n")}
${JSON.stringify(negativeSpace).slice(0, 200)}

=== CONCEPT DETAILS ===
Hook type: ${concept.hook_type || "scarcity"}
Text overlays to include: ${JSON.stringify(concept.text_overlays || [])}
Approved CTAs: ${JSON.stringify((adDirectives.calls_to_action || []) as unknown[]).slice(0, 200)}
Visual hooks: ${JSON.stringify((adDirectives.visual_hooks || []) as unknown[]).slice(0, 200)}

=== ATTACHED: REFERENCE AD IMAGE ===
This image is for INSPIRATION ONLY — learn from its effective elements but create something ORIGINAL and potentially BETTER for this product. The analysis data above tells you exactly which elements of this ad work and why.

=== YOUR TASK ===
Write a 150-word image generation prompt for a NEW ORIGINAL 1080x1080 Meta ad that:
1. Features "${concept.product?.name || "Product"}" as the hero product
2. Uses the WINNING PATTERNS identified from analysis (not just copying the reference)
3. Applies the persuasion mechanics that score highest (from the analysis insights above)
4. Uses brand colors specifically: ${colorStr}
5. Includes the text overlays as part of the ad design
6. Creates something that could OUTPERFORM the reference ad, not just match it
7. Avoids the failure patterns listed above

The prompt should describe: product placement, background, text positioning, color usage, mood, and the specific persuasion approach.

Return JSON:
{
  "prompt": "150-word image generation prompt for a NEW ORIGINAL ad",
  "analysis_summary": "2-3 sentences: what specific patterns from the analysis are being used and why this concept should convert"
}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: analysisPrompt },
              { inlineData: { mimeType: refMimeType, data: refImageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return errorResponse("AI_FAILED", `Gemini error: ${errText.slice(0, 200)}`, 500);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result: Record<string, string>;
    try {
      result = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : { prompt: text, analysis_summary: "" };
    }

    return successResponse({
      prompt: result.prompt || "",
      analysis: result.analysis || "",
      analysis_summary: result.analysis_summary || "",
    });
  } catch (err) {
    return errorResponse("ERROR", (err as Error).message, 500);
  }
}
