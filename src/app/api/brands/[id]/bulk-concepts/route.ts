import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api/response";

// Allow long-running requests
export const maxDuration = 600;

/**
 * GET: List all bulk concepts for a brand
 * POST: Generate bulk concept specs (text only, no images)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("ad_concepts")
    .eq("id", id)
    .single();

  // bulk_concepts stored as a separate field or in ad_concepts with a bulk flag
  // For now, we'll use a metadata approach — store in brand as bulk_concepts
  const { data } = await supabase
    .from("brands")
    .select("ad_concepts")
    .eq("id", id)
    .single();

  return successResponse(data?.ad_concepts || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const conceptCount = body.concept_count || 200;
  const selectedModel = body.model || "gemini-2.5-pro";
  const appendMode = body.append === true;

  const supabase = await createClient();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse("NO_KEY", "GEMINI_API_KEY not configured");

  // Gather all data
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna, creative_intelligence_report, store_scrape_data, ad_concepts")
    .eq("id", id)
    .single();

  if (!brand?.brand_dna) return errorResponse("NO_DNA", "Brand DNA not found");

  const brandDNA = brand.brand_dna as Record<string, unknown>;
  const report = (brand.creative_intelligence_report || {}) as Record<string, unknown>;
  const scrapeData = brand.store_scrape_data as Record<string, unknown> | null;

  const allProducts = ((scrapeData?.collections || []) as Array<{
    products: Array<{ name: string; slug: string; price: string; description: string; images: string[] }>;
  }>).flatMap((c) => c.products);

  if (allProducts.length === 0) return errorResponse("NO_PRODUCTS", "No products found");

  console.log(`[BULK] Starting: ${conceptCount} concepts, ${allProducts.length} products, ${selectedModel} model, apiKey=${apiKey ? "SET" : "MISSING"}`);

  // Get reference ads
  const { data: topAds } = await supabase
    .from("ad_library_ads")
    .select("id, image_url, analysis, performance_tier, source_type")
    .eq("brand_id", id)
    .eq("analysis_status", "complete")
    .or("flag.is.null,flag.eq.reference")
    .order("performance_tier", { ascending: true })
    .limit(20);

  const refAds = topAds || [];
  const visualIdentity = (brandDNA.visual_identity || {}) as Record<string, unknown>;
  const messaging = (brandDNA.messaging_framework || {}) as Record<string, unknown>;
  const negativeSpace = (brandDNA.negative_brand_space || {}) as Record<string, unknown>;
  const winningPatterns = (report.winning_creative_patterns || []) as unknown[];
  const failurePatterns = (report.failure_patterns || []) as unknown[];

  const hookTypes = ["scarcity", "social_proof", "bold_claim", "emotional", "curiosity", "price_anchor", "before_after", "testimonial"];

  // Pro = 1 per call (high quality, no truncation). Flash = 4 per call (faster).
  const existingConcepts = appendMode && Array.isArray(brand?.ad_concepts)
    ? (brand.ad_concepts as Record<string, unknown>[])
    : [];
  const allConcepts: Record<string, unknown>[] = [...existingConcepts];
  const startIndex = existingConcepts.length;
  const batchSize = selectedModel === "gemini-2.5-flash" ? 4 : 1;

  for (let batchStart = 0; batchStart < conceptCount; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, conceptCount);
    const batchCount = batchEnd - batchStart;

    // Pick products and hooks (offset by existing count for proper round-robin)
    const batchItems = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const globalIndex = startIndex + i;
      const product = allProducts[globalIndex % allProducts.length];
      const hook = hookTypes[globalIndex % hookTypes.length];
      const ref = refAds.length > 0 ? refAds[globalIndex % refAds.length] : null;
      const refAnalysis = ref?.analysis as Record<string, unknown> | null;
      batchItems.push({ product, hook, ref, refAnalysis, index: globalIndex + 1 });
    }

    // Extract brand specifics
    const storeName = (scrapeData?.store_name as string) || "";
    const logoUrl = ((scrapeData?.branding as Record<string, unknown>)?.logo_url as string) || "";
    const colorPalette = (visualIdentity.color_palette || {}) as Record<string, unknown>;
    const primaryColors = (colorPalette.primary || visualIdentity.primary_colors || []) as Array<Record<string, string> | string>;
    const accentColors = (colorPalette.accent || visualIdentity.accent_colors || []) as Array<Record<string, string> | string>;
    const typography = (visualIdentity.typography || {}) as Record<string, string>;
    const adDirectives = (brandDNA.ad_creative_directives || {}) as Record<string, unknown>;

    // Build rich concept descriptions with FULL reference ad analysis
    const conceptList = batchItems.map((item) => {
      const ra = item.refAnalysis || {};
      return `
CONCEPT ${item.index}:
  Product: "${item.product.name}" — $${item.product.price}
  Product Description: ${item.product.description?.slice(0, 120) || "Premium quality apparel"}
  Product Image URL: ${item.product.images?.[0] || "none"}
  Hook Type: ${item.hook}

  REFERENCE AD TO REPLICATE (study and follow this ad's approach):
    URL: ${item.ref?.image_url || "none"}
    Archetype: ${ra.archetype || "unknown"}
    Layout: ${typeof ra.layout_architecture === "string" ? ra.layout_architecture.slice(0, 300) : JSON.stringify(ra.layout_architecture || {}).slice(0, 300)}
    Persuasion: ${typeof ra.persuasion_mechanics === "string" ? ra.persuasion_mechanics.slice(0, 300) : JSON.stringify(ra.persuasion_mechanics || {}).slice(0, 300)}
    Typography: ${typeof ra.typography_analysis === "string" ? ra.typography_analysis.slice(0, 200) : JSON.stringify(ra.typography_analysis || {}).slice(0, 200)}
    Colors: ${typeof ra.color_analysis === "string" ? ra.color_analysis.slice(0, 200) : JSON.stringify(ra.color_analysis || {}).slice(0, 200)}
    Product Presentation: ${typeof ra.product_presentation === "string" ? ra.product_presentation.slice(0, 200) : JSON.stringify(ra.product_presentation || {}).slice(0, 200)}
    Scores: ${JSON.stringify(ra.overall_scores || {})}
    Patterns: ${JSON.stringify(ra.patterns || [])}
    REPLICATE the layout, persuasion mechanics, and visual style of this reference ad.`;
    }).join("\n");

    // Format brand colors with names
    const colorStr = primaryColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");
    const accentStr = accentColors.map((c) => typeof c === "string" ? c : `${c.hex} (${c.name})`).join(", ");

    const prompt = `You are an elite performance ad creative director. Generate ${batchCount} Meta ad concept specs.

=== BRAND VISUAL SYSTEM ===
Brand: ${storeName}
Logo: ${logoUrl || "Use brand name text"}
Headline Font: ${typography.primary_font || "Bold sans-serif"}
Body Font: ${typography.secondary_font || "Clean sans-serif"}
Primary Colors: ${colorStr || "Dark navy, white"}
Accent Colors: ${accentStr || "Yellow, Red"}
Photography: ${String(visualIdentity.photography_style || visualIdentity.imagery_tone || "Premium product photography")}
Logo Concept: ${String(visualIdentity.logo_concept || "Brand mark")}

=== BRAND VOICE ===
Tone: ${String(messaging.tone_of_voice || "professional")}
Key Messages: ${JSON.stringify(messaging.key_messages || messaging.value_propositions || []).slice(0, 400)}
Approved CTAs: ${JSON.stringify((adDirectives.calls_to_action || []) as unknown[]).slice(0, 200)}
Visual Hooks: ${JSON.stringify((adDirectives.visual_hooks || []) as unknown[]).slice(0, 300)}

=== WHAT CONVERTS (from analysis of ${refAds.length} ads) ===
${winningPatterns.map((p) => typeof p === "string" ? `✓ ${p}` : `✓ ${JSON.stringify(p).slice(0, 150)}`).join("\n")}

=== WHAT FAILS (never do these) ===
${failurePatterns.map((p) => typeof p === "string" ? `✗ ${p}` : `✗ ${JSON.stringify(p).slice(0, 120)}`).join("\n")}
${JSON.stringify(negativeSpace).slice(0, 300)}

=== CONCEPTS TO GENERATE ===
${conceptList}

=== OUTPUT FORMAT ===
Return JSON: {"concepts": [{
  "concept_number": N,
  "concept_name": "creative name",
  "product": {"name": "EXACT name from above", "price": "EXACT price", "image_url": "EXACT product image URL from above", "description": "product desc"},
  "reference_ad_url": "EXACT reference ad URL from above",
  "reference_ad_analysis_summary": "2-3 sentences: what makes the reference ad effective, which specific layout/persuasion/color patterns to replicate",
  "hook_type": "the hook type",
  "strategic_brief": {"objective": "...", "target_emotion": "...", "funnel_stage": "awareness|consideration|conversion", "key_message": "..."},
  "ad_layout": {"format": "1080x1080", "background_style": "specific description", "product_placement": "where/how product appears e.g. 'product fills right 50%, angled 30deg'", "overall_style": "e.g. premium-military, bold-sale, scarcity-urgency"},
  "text_overlays": [{"type": "headline|offer|cta|brand", "text": "ACTUAL compelling copy", "position": "top-center|center|bottom", "style": "font, size, color specifics"}],
  "brand_elements": {"primary_color": "#hex", "accent_color": "#hex", "text_color": "#hex", "background_color": "#hex", "logo_url": "${logoUrl}", "logo_position": "top-left"},
  "image_generation_prompt": "150 words. MUST specify: (1) exact product from attached image—angle, size, position in frame (2) background color/texture using brand colors (3) where each text overlay sits with font style and color (4) which persuasion pattern from reference ad is being used (5) lighting and mood. NOT generic—specific to THIS product and THIS reference ad's winning pattern."
}]}`;

    try {
      const geminiModel = selectedModel === "gemini-2.5-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 16384, responseMimeType: "application/json" },
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`Batch ${batchStart}-${batchEnd} failed (${resp.status}):`, errText.slice(0, 200));
        continue;
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log(`Batch ${batchStart}-${batchEnd}: got ${text.length} chars`);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract valid JSON — handle truncated responses
        try {
          // Find the concepts array and extract individual concept objects
          const conceptsMatch = text.match(/"concepts"\s*:\s*\[([\s\S]*)/);
          if (conceptsMatch) {
            // Try to find complete concept objects within the truncated array
            const conceptObjects: Record<string, unknown>[] = [];
            const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            let match;
            while ((match = regex.exec(conceptsMatch[1])) !== null) {
              try {
                const obj = JSON.parse(match[0]);
                if (obj.concept_name || obj.concept_number) {
                  conceptObjects.push(obj);
                }
              } catch { /* skip malformed objects */ }
            }
            parsed = { concepts: conceptObjects };
            console.log(`Batch ${batchStart}-${batchEnd}: recovered ${conceptObjects.length} concepts from truncated JSON`);
          } else {
            parsed = {};
          }
        } catch {
          console.error(`Batch ${batchStart}-${batchEnd}: JSON parse completely failed`);
          parsed = {};
        }
      }

      const concepts = ((parsed as { concepts?: unknown[] }).concepts || []) as Record<string, unknown>[];
      console.log(`Batch ${batchStart}-${batchEnd}: parsed ${concepts.length} concepts`);

      // Enrich with product image URLs, brand data, and reference ad URLs
      for (let ci = 0; ci < concepts.length; ci++) {
        const concept = concepts[ci];
        const originalItem = batchItems[ci];
        const prod = concept.product as Record<string, unknown> | undefined;

        if (prod) {
          const prodName = String(prod.name || "").toLowerCase();
          // Match product by name: exact → contains → first word match → fallback to assigned product
          const matchedProduct =
            allProducts.find((p) => p.name.toLowerCase() === prodName) ||
            allProducts.find((p) => p.name.toLowerCase().includes(prodName) || prodName.includes(p.name.toLowerCase())) ||
            allProducts.find((p) => {
              const words = prodName.split(/[\s\-]+/).filter((w) => w.length > 3);
              return words.some((w) => p.name.toLowerCase().includes(w));
            }) ||
            originalItem?.product;

          if (matchedProduct) {
            prod.name = matchedProduct.name;
            prod.price = matchedProduct.price;
            prod.images = matchedProduct.images;
            prod.image_url = matchedProduct.images?.[0] || null;
            prod.description = matchedProduct.description;
          }

          // Final fallback: if still no image, use the original product's image
          if (!prod.image_url && originalItem?.product?.images?.[0]) {
            prod.images = originalItem.product.images;
            prod.image_url = originalItem.product.images[0];
          }
        }

        // Ensure brand elements include logo
        const brandElems = (concept.brand_elements || {}) as Record<string, unknown>;
        brandElems.logo_url = logoUrl;
        brandElems.store_name = storeName;
        concept.brand_elements = brandElems;

        // Ensure reference ad URL is set
        if (!concept.reference_ad_url && originalItem?.ref) {
          concept.reference_ad_url = originalItem.ref.image_url;
        }

        // Add status tracking
        concept.image_status = "not_generated";
        concept.image_url = null;
        concept.generated_ad_id = null;
      }

      allConcepts.push(...concepts);

      // Deduplicate by concept_name before saving (keep version with image if exists)
      const seen = new Map<string, Record<string, unknown>>();
      for (const c of allConcepts) {
        const name = String(c.concept_name || `c${c.concept_number}`);
        if (!seen.has(name) || (c.image_url && !seen.get(name)!.image_url)) {
          seen.set(name, c);
        }
      }
      const dedupedConcepts = Array.from(seen.values());

      // Save after EVERY batch so UI can poll and show progressively
      await supabase
        .from("brands")
        .update({ ad_concepts: dedupedConcepts })
        .eq("id", id);
    } catch (err) {
      console.error(`Batch ${batchStart} error:`, (err as Error).message);
    }
  }

  return successResponse({
    total: allConcepts.length,
    concepts: allConcepts,
  });
}
