import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allow up to 10 minutes for image generation (12 images)
export const maxDuration = 600;
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";

/**
 * Direct pipeline processor for local development.
 * Bypasses Edge Functions — processes the stage directly via API routes.
 * In production, Edge Functions handle this via DB webhooks.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id: brandId, stage: stageStr } = await params;
  const stageNum = parseInt(stageStr, 10);
  const body = await request.json().catch(() => ({}));
  const jobId = body.job_id;
  const selectedModel = body.model || null; // User-selected AI model

  const supabase = await createClient();

  try {
    // Mark job as processing and update pipeline_status
    if (jobId) {
      await supabase
        .from("pipeline_jobs")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    // Always set pipeline_status to current stage
    await supabase
      .from("brands")
      .update({ pipeline_status: `stage_${stageNum}`, current_stage_status: "processing" })
      .eq("id", brandId);

    switch (stageNum) {
      case 1:
        return await processStage1(supabase, brandId, jobId);
      case 2:
        return await processStage2(supabase, brandId, jobId, selectedModel);
      case 4:
        return await processStage4(supabase, brandId, jobId, selectedModel);
      case 5:
        return await processStage5(supabase, brandId, jobId, selectedModel);
      case 6:
        return await processStage6(supabase, brandId, jobId, selectedModel);
      case 7:
        return await processStage7(supabase, brandId, jobId, selectedModel);
      case 8:
        return await processStage8(supabase, brandId, jobId, selectedModel, body.concept_count);
      default:
        return errorResponse(
          "NOT_IMPLEMENTED",
          `Direct processing for stage ${stageNum} not yet implemented. Deploy Edge Functions for full pipeline.`
        );
    }
  } catch (err) {
    // Mark job as failed
    if (jobId) {
      await supabase
        .from("pipeline_jobs")
        .update({
          status: "failed",
          error_message: (err as Error).message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabase
        .from("brands")
        .update({ current_stage_status: "failed" })
        .eq("id", brandId);
    }

    return errorResponse("PROCESSING_FAILED", (err as Error).message, 500);
  }
}

async function processStage1(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string
) {
  // Get brand
  const { data: brand } = await supabase
    .from("brands")
    .select("store_url")
    .eq("id", brandId)
    .single();

  if (!brand) throw new Error("Brand not found");

  // Update progress
  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        progress: {
          items_total: 1,
          items_processed: 0,
          items_failed: 0,
          current_item: "Calling scraper...",
          percent: 20,
        },
      })
      .eq("id", jobId);
  }

  // Call Python scraper
  const scraperUrl = process.env.PYTHON_SCRAPER_URL || "http://localhost:8000";

  const scrapeResponse = await fetch(`${scraperUrl}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store_url: brand.store_url,
      brand_id: brandId,
      upload_assets: false, // Skip Supabase upload for local dev
    }),
  });

  if (!scrapeResponse.ok) {
    const errText = await scrapeResponse.text();
    throw new Error(`Scraper error (${scrapeResponse.status}): ${errText}`);
  }

  const scrapeResult = await scrapeResponse.json();

  // Update progress
  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        progress: {
          items_total: 1,
          items_processed: 0,
          items_failed: 0,
          current_item: "Saving results...",
          percent: 80,
        },
      })
      .eq("id", jobId);
  }

  // Save scrape data to brand
  await supabase
    .from("brands")
    .update({ store_scrape_data: scrapeResult.data })
    .eq("id", brandId);

  // Complete job
  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        progress: {
          items_total: 1,
          items_processed: 1,
          items_failed: 0,
          current_item: null,
          percent: 100,
        },
        result: {
          platform: scrapeResult.data?.platform,
          collections: (scrapeResult.data?.collections || []).length,
          status: scrapeResult.status,
        },
      })
      .eq("id", jobId);
  }

  // Set brand to review
  await supabase
    .from("brands")
    .update({ current_stage_status: "review" })
    .eq("id", brandId);

  return successResponse({
    success: true,
    job_id: jobId,
    scrape_status: scrapeResult.status,
  });
}

async function processStage2(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  selectedModel?: string | null
) {
  // Get brand scrape data for DNA generation
  const { data: brand } = await supabase
    .from("brands")
    .select("store_scrape_data")
    .eq("id", brandId)
    .single();

  if (!brand?.store_scrape_data) throw new Error("No scrape data available");

  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        progress: {
          items_total: 1, items_processed: 0, items_failed: 0,
          current_item: "Generating Brand DNA with AI...", percent: 20,
        },
      })
      .eq("id", jobId);
  }

  // Call Gemini 2.5 Pro
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured. Add it to .env.local");

  const scrapeData = brand.store_scrape_data as Record<string, unknown>;
  const productSample = ((scrapeData.collections as Array<{ products?: Array<{ name: string; price: string; description?: string }> }>) || [])
    .flatMap((c) => c.products || [])
    .slice(0, 10)
    .map((p) => `- ${p.name}: $${p.price}`)
    .join("\n");

  const prompt = `You are a brand strategist. Generate a comprehensive Brand DNA as JSON from this store data.

Store: ${(scrapeData as { store_name?: string }).store_name || "Unknown"}
URL: ${(scrapeData as { store_url?: string }).store_url || ""}
Platform: ${(scrapeData as { platform?: string }).platform || "unknown"}
Tagline: ${(scrapeData as { tagline?: string }).tagline || "None"}
Description: ${(scrapeData as { description?: string }).description || "None"}
Colors: ${((scrapeData.branding as { colors?: string[] })?.colors || []).join(", ") || "None"}
Fonts: ${((scrapeData.branding as { fonts?: string[] })?.fonts || []).join(", ") || "None"}
Products: ${productSample || "None"}

Return JSON with sections: brand_identity, target_audience, visual_identity, messaging_framework, competitive_positioning, negative_brand_space, ad_creative_directives. Each with arrays and strings of specific content.`;

  const modelId = (selectedModel === "gemini-2.5-flash") ? "gemini-2.5-flash" : "gemini-2.5-pro";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        progress: {
          items_total: 1, items_processed: 0, items_failed: 0,
          current_item: "Waiting for Gemini response...", percent: 40,
        },
      })
      .eq("id", jobId);
  }

  const geminiResp = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiResp.ok) {
    const errText = await geminiResp.text();
    throw new Error(`Gemini API error (${geminiResp.status}): ${errText}`);
  }

  const geminiData = await geminiResp.json();
  const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        progress: {
          items_total: 1, items_processed: 0, items_failed: 0,
          current_item: "Parsing Brand DNA...", percent: 80,
        },
      })
      .eq("id", jobId);
  }

  let brandDNA: Record<string, unknown>;
  try {
    brandDNA = JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      brandDNA = JSON.parse(match[0]);
    } else {
      throw new Error("Failed to parse Gemini response as JSON");
    }
  }

  // Save Brand DNA
  await supabase
    .from("brands")
    .update({ brand_dna: brandDNA, brand_dna_version: 1 })
    .eq("id", brandId);

  // Complete job
  if (jobId) {
    await supabase
      .from("pipeline_jobs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        progress: {
          items_total: 1, items_processed: 1, items_failed: 0,
          current_item: null, percent: 100,
        },
        result: { sections: Object.keys(brandDNA) },
      })
      .eq("id", jobId);
  }

  await supabase
    .from("brands")
    .update({ current_stage_status: "review" })
    .eq("id", brandId);

  return successResponse({ success: true, job_id: jobId });
}

async function processStage4(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  selectedModel?: string | null
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Get brand DNA for context
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna")
    .eq("id", brandId)
    .single();

  // Get all pending ads (not ignored — flag is null or not 'ignore')
  const { data: ads } = await supabase
    .from("ad_library_ads")
    .select("id, image_url")
    .eq("brand_id", brandId)
    .or("flag.is.null,flag.neq.ignore")
    .order("uploaded_at");

  if (!ads || ads.length === 0) throw new Error("No ads to analyze");

  const total = ads.length;
  const dnaSnippet = brand?.brand_dna
    ? JSON.stringify(brand.brand_dna).slice(0, 2000)
    : "";

  const analysisPrompt = `Analyze this ad image. Score dimensions 1-10, classify archetype. Respond with JSON containing: layout_architecture, typography_analysis, color_analysis, product_presentation, human_element, persuasion_mechanics, overall_scores (creative_quality, scroll_stopping_power, conversion_potential, brand_consistency, platform_optimization), archetype, archetype_traits, patterns, competitive_gaps.${dnaSnippet ? `\n\nBrand context: ${dnaSnippet}` : ""}`;

  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];

    if (jobId) {
      await supabase.from("pipeline_jobs").update({
        progress: {
          items_total: total, items_processed: i, items_failed: 0,
          current_item: `Analyzing ad ${i + 1}/${total}...`,
          percent: Math.round((i / total) * 100),
        },
      }).eq("id", jobId);
    }

    try {
      // Download image
      const imgResp = await fetch(ad.image_url);
      if (!imgResp.ok) throw new Error("Failed to download image");
      const imgBuffer = await imgResp.arrayBuffer();
      const base64 = Buffer.from(imgBuffer).toString("base64");
      const contentType = imgResp.headers.get("content-type") || "image/jpeg";

      // Call Gemini for vision analysis
      const analysisModel = selectedModel === "gemini-2.5-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${analysisModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: analysisPrompt },
                { inlineData: { mimeType: contentType, data: base64 } },
              ],
            }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!geminiResp.ok) throw new Error(`Gemini error: ${geminiResp.status}`);

      const geminiData = await geminiResp.json();
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let analysis: Record<string, unknown>;
      try {
        analysis = JSON.parse(responseText);
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/);
        analysis = match ? JSON.parse(match[0]) : {};
      }

      await supabase.from("ad_library_ads").update({
        analysis,
        analysis_status: "complete",
        analyzed_at: new Date().toISOString(),
      }).eq("id", ad.id);

    } catch (err) {
      console.error(`Failed to analyze ad ${ad.id}:`, (err as Error).message);
      await supabase.from("ad_library_ads").update({
        analysis_status: "failed",
      }).eq("id", ad.id);
    }
  }

  // Complete
  const { count: completed } = await supabase
    .from("ad_library_ads")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("analysis_status", "complete");

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      status: "complete",
      completed_at: new Date().toISOString(),
      progress: {
        items_total: total, items_processed: completed || 0, items_failed: 0,
        current_item: null, percent: 100,
      },
    }).eq("id", jobId);
  }

  await supabase.from("brands").update({ current_stage_status: "review" }).eq("id", brandId);
  return successResponse({ success: true, job_id: jobId, analyzed: completed });
}

async function processStage5(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  selectedModel?: string | null
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna")
    .eq("id", brandId)
    .single();

  if (!brand?.brand_dna) throw new Error("Brand DNA not found");

  const { data: ads } = await supabase
    .from("ad_library_ads")
    .select("analysis")
    .eq("brand_id", brandId)
    .eq("analysis_status", "complete")
    .or("flag.is.null,flag.neq.ignore");

  if (!ads || ads.length === 0) throw new Error("No analyzed ads");

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      progress: { items_total: 1, items_processed: 0, items_failed: 0,
        current_item: "Synthesizing intelligence...", percent: 30 },
    }).eq("id", jobId);
  }

  const prompt = `Synthesize ad analyses into strategic intelligence report. Return JSON with: winning_creative_patterns, creative_archetype_clusters, competitive_creative_intelligence (gaps/opportunities/threats), failure_patterns, strategic_recommendations with four_ad_concept_directions (4 concepts: name, archetype, hook_type, funnel_stage, rationale, supporting_patterns) and general_recommendations.

Brand DNA: ${JSON.stringify(brand.brand_dna).slice(0, 4000)}
Analyses (${ads.length} ads): ${JSON.stringify(ads.map(a => a.analysis).slice(0, 30)).slice(0, 20000)}`;

  const s5Model = (selectedModel === "gemini-2.5-flash") ? "gemini-2.5-flash" : "gemini-2.5-pro";
  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s5Model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" },
      }),
    }
  );

  if (!geminiResp.ok) throw new Error(`Gemini error: ${geminiResp.status}`);

  const geminiData = await geminiResp.json();
  const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let report: Record<string, unknown>;
  try { report = JSON.parse(responseText); }
  catch { const m = responseText.match(/\{[\s\S]*\}/); report = m ? JSON.parse(m[0]) : {}; }

  await supabase.from("brands").update({ creative_intelligence_report: report }).eq("id", brandId);

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      status: "complete", completed_at: new Date().toISOString(),
      progress: { items_total: 1, items_processed: 1, items_failed: 0, current_item: null, percent: 100 },
    }).eq("id", jobId);
  }

  await supabase.from("brands").update({ current_stage_status: "review" }).eq("id", brandId);
  return successResponse({ success: true, job_id: jobId });
}

async function processStage6(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  selectedModel?: string | null
) {
  // Gather ALL data for concept generation
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna, creative_intelligence_report, store_scrape_data")
    .eq("id", brandId)
    .single();

  if (!brand?.brand_dna) throw new Error("Brand DNA not found");
  if (!brand?.creative_intelligence_report) throw new Error("Intelligence report not found");

  // Get top-performing analyzed ads WITH FULL ANALYSIS
  const { data: topAds } = await supabase
    .from("ad_library_ads")
    .select("id, image_url, source_type, performance_tier, analysis, ad_copy")
    .eq("brand_id", brandId)
    .eq("analysis_status", "complete")
    .or("flag.is.null,flag.eq.reference")
    .order("performance_tier", { ascending: true })
    .limit(10);

  // Extract products from store data
  const scrapeData = brand.store_scrape_data as Record<string, unknown> | null;
  const collections = (scrapeData?.collections || []) as Array<{
    name: string; slug: string;
    products: Array<{ name: string; slug: string; price: string; description: string; images: string[] }>;
  }>;
  const allProducts = collections.flatMap((c) => c.products);

  const brandDNA = brand.brand_dna as Record<string, unknown>;
  const report = brand.creative_intelligence_report as Record<string, unknown>;
  const recommendations = (report.strategic_recommendations || report.recommendations || {}) as Record<string, unknown>;
  const directions = recommendations.four_ad_concept_directions || recommendations.concept_directions || [];

  // Extract structured data for the supercharged prompt
  const visualIdentity = (brandDNA.visual_identity || {}) as Record<string, unknown>;
  const negativeSpace = (brandDNA.negative_brand_space || {}) as Record<string, unknown>;
  const adDirectives = (brandDNA.ad_creative_directives || {}) as Record<string, unknown>;
  const messaging = (brandDNA.messaging_framework || {}) as Record<string, unknown>;
  const winningPatterns = (report.winning_creative_patterns || []) as unknown[];
  const failurePatterns = (report.failure_patterns || []) as unknown[];
  const compIntel = ((report.competitive_creative_intelligence || {}) as unknown as Record<string, unknown>);

  // Build FULL reference ad blueprints (not just metadata)
  const referenceBlueprints = (topAds || []).slice(0, 5).map((ad, i) => {
    const analysis = ad.analysis as Record<string, unknown> | null;
    return `
REFERENCE AD #${i + 1} (${ad.performance_tier} | ${ad.source_type}):
  Image: ${ad.image_url}
  Archetype: ${(analysis as Record<string, unknown>)?.archetype || "unknown"}
  Layout: ${JSON.stringify((analysis as Record<string, unknown>)?.layout_architecture || "N/A").slice(0, 300)}
  Typography: ${JSON.stringify((analysis as Record<string, unknown>)?.typography_analysis || "N/A").slice(0, 200)}
  Colors: ${JSON.stringify((analysis as Record<string, unknown>)?.color_analysis || "N/A").slice(0, 200)}
  Persuasion: ${JSON.stringify((analysis as Record<string, unknown>)?.persuasion_mechanics || "N/A").slice(0, 300)}
  Product Presentation: ${JSON.stringify((analysis as Record<string, unknown>)?.product_presentation || "N/A").slice(0, 200)}
  Overall Scores: ${JSON.stringify((analysis as Record<string, unknown>)?.overall_scores || {})}
  Ad Copy: ${JSON.stringify(ad.ad_copy || {})}`;
  }).join("\n");

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      progress: { items_total: 1, items_processed: 0, items_failed: 0,
        current_item: "Building concept specs with full brand context...", percent: 20 },
    }).eq("id", jobId);
  }

  // Build supercharged 6-section prompt
  const prompt = `You are an elite performance marketing creative director. Your ads consistently achieve 3x+ ROAS on Meta.

=== SECTION 1: BRAND CREATIVE BLUEPRINT ===
Brand Identity: ${JSON.stringify(brandDNA.brand_identity || {}).slice(0, 500)}
Visual System:
  Colors: ${JSON.stringify(visualIdentity.primary_colors || visualIdentity.colors || [])}
  Secondary: ${JSON.stringify(visualIdentity.secondary_colors || [])}
  Accent: ${JSON.stringify(visualIdentity.accent_colors || [])}
  Typography: ${JSON.stringify(visualIdentity.typography || {})}
  Photography: ${String(visualIdentity.photography_style || visualIdentity.imagery_tone || "professional product photography")}
Messaging Rules:
  Tone: ${String(messaging.tone_of_voice || "professional")}
  Key Messages: ${JSON.stringify(messaging.key_messages || messaging.value_propositions || []).slice(0, 300)}
  Communication Pillars: ${JSON.stringify(messaging.communication_pillars || []).slice(0, 200)}
Ad Directives: ${JSON.stringify(adDirectives).slice(0, 400)}

=== SECTION 2: AVAILABLE PRODUCTS ===
${allProducts.slice(0, 15).map((p, i) => `${i + 1}. "${p.name}" — $${p.price} | ${p.description?.slice(0, 100) || "No description"} | ${p.images?.length || 0} images`).join("\n")}

=== SECTION 3: WINNING AD BLUEPRINTS (FULL ANALYSIS) ===
These are the top-performing ads. Study their EXACT patterns — layout, typography, colors, persuasion mechanics — and replicate what works.
${referenceBlueprints}

=== SECTION 4: COMPETITIVE GAPS TO EXPLOIT ===
${JSON.stringify((compIntel.gaps as unknown[] || []).slice(0, 5)).slice(0, 600)}
Opportunities: ${JSON.stringify((compIntel.opportunities as unknown[] || []).slice(0, 3)).slice(0, 400)}

=== SECTION 5: WINNING PATTERNS TO FOLLOW ===
${winningPatterns.slice(0, 6).map((p) => typeof p === "string" ? `• ${p}` : `• ${(p as Record<string, unknown>).name || JSON.stringify(p).slice(0, 150)}`).join("\n")}

Strategic Concept Directions: ${JSON.stringify(directions).slice(0, 1000)}

=== SECTION 6: ANTI-PATTERNS — NEVER DO THIS ===
${failurePatterns.slice(0, 4).map((p) => typeof p === "string" ? `✗ ${p}` : `✗ ${(p as Record<string, unknown>).name || JSON.stringify(p).slice(0, 100)}`).join("\n")}
Negative Brand Space: ${JSON.stringify(negativeSpace).slice(0, 400)}

---

TASK: Generate exactly 4 ad concepts. Rules:
1. Each concept MUST feature a DIFFERENT product from the store
2. Each concept MUST reference a specific winning ad as style inspiration
3. Each concept MUST use a different hook type (rotate: scarcity, social proof, bold claim, emotional)
4. The image_generation_prompt MUST describe a COMPLETE FINAL AD (not a product photo) — include text placement, brand colors, product position, background
5. Text overlays MUST contain specific, compelling copy (not placeholder text)
6. Follow the winning patterns from Section 3 and 5

Return JSON:
{
  "concepts": [
    {
      "concept_number": 1,
      "concept_name": "string — creative name for this concept",
      "product": {
        "name": "EXACT product name from store list",
        "price": "exact price",
        "image_index": 0
      },
      "reference_ad_url": "URL of the reference ad whose style to follow",
      "reference_ad_analysis_summary": "2-3 sentences describing what makes this reference ad effective and what patterns to replicate",
      "strategic_brief": {
        "objective": "specific conversion goal",
        "target_emotion": "primary emotion to trigger",
        "funnel_stage": "awareness|consideration|conversion",
        "hook_type": "scarcity|social_proof|bold_claim|emotional|curiosity|price_anchor",
        "key_message": "the single most important message",
        "why_this_works": "1 sentence explaining why this concept will convert based on the data"
      },
      "ad_layout": {
        "format": "1080x1080",
        "background_style": "detailed description of background",
        "product_placement": "exactly where and how the product appears (e.g., 'product fills bottom 60%, shot from 45-degree angle')",
        "overall_style": "e.g. minimal-premium, bold-sale, lifestyle-aspirational",
        "composition_rule": "e.g. rule-of-thirds with product right, text-heavy top third"
      },
      "text_overlays": [
        {
          "type": "headline",
          "text": "ACTUAL HEADLINE TEXT (compelling, specific, action-oriented)",
          "position": "top-center",
          "style": "bold white 48px uppercase with text-shadow"
        },
        {
          "type": "offer",
          "text": "ACTUAL OFFER TEXT (e.g., 'Starting at ₹399' or 'Buy 2 Get 1 Free')",
          "position": "center",
          "style": "accent color 36px bold"
        },
        {
          "type": "cta",
          "text": "ACTUAL CTA TEXT (e.g., 'Shop Now →' or 'Claim Your Deal')",
          "position": "bottom-center",
          "style": "white on accent-color button 20px bold uppercase"
        }
      ],
      "brand_elements": {
        "primary_color": "#hex from brand DNA",
        "accent_color": "#hex from brand DNA",
        "background_color": "#hex",
        "text_color": "#hex",
        "logo_position": "top-left|top-right",
        "logo_size": "small"
      },
      "image_generation_prompt": "150-200 word DETAILED prompt for AI image generation. Must describe: (1) exact product placement and angle, (2) background scene/color/texture, (3) where each text overlay goes with content, (4) brand color usage, (5) lighting and mood, (6) overall composition following the reference ad's winning pattern. This generates the FINAL AD ready to post on Meta — not a product photo.",
      "quality_checklist": ["Product clearly visible and prominent", "All text is readable at mobile size", "Brand colors used correctly", "CTA is clear and actionable", "Follows reference ad pattern"]
    }
  ]
}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      progress: { items_total: 1, items_processed: 0, items_failed: 0,
        current_item: "AI generating concept specs...", percent: 50 },
    }).eq("id", jobId);
  }

  const useClaude = selectedModel === "claude-sonnet" && process.env.CLAUDE_API_KEY;
  let responseText = "";

  if (useClaude) {
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.7,
        system: "Expert ad creative director. Respond with valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!claudeResp.ok) throw new Error(`Claude error: ${claudeResp.status}`);
    const claudeData = await claudeResp.json();
    responseText = claudeData.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("") || "";
  } else {
    const geminiModel = selectedModel === "gemini-2.5-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" },
        }),
      }
    );
    if (!geminiResp.ok) throw new Error(`Gemini error: ${geminiResp.status}`);
    const geminiData = await geminiResp.json();
    responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  let conceptsData: Record<string, unknown>;
  try { conceptsData = JSON.parse(responseText); }
  catch { const m = responseText.match(/\{[\s\S]*\}/); conceptsData = m ? JSON.parse(m[0]) : {}; }

  const concepts = (conceptsData as { concepts?: unknown[] }).concepts || [];

  await supabase.from("brands").update({ ad_concepts: concepts }).eq("id", brandId);

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      status: "complete", completed_at: new Date().toISOString(),
      progress: { items_total: 1, items_processed: 1, items_failed: 0, current_item: null, percent: 100 },
    }).eq("id", jobId);
  }

  await supabase.from("brands").update({ current_stage_status: "review" }).eq("id", brandId);
  return successResponse({ success: true, job_id: jobId, concepts: concepts.length });
}

async function processStage7(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  _selectedModel?: string | null
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  // Get concepts with product + reference ad data
  const { data: brand } = await supabase
    .from("brands")
    .select("ad_concepts, store_scrape_data, brand_dna")
    .eq("id", brandId)
    .single();

  const concepts = (brand?.ad_concepts || []) as Array<{
    concept_number?: number;
    concept_name?: string;
    image_generation_prompt?: string;
    product?: { name?: string; price?: string; image_index?: number };
    reference_ad_url?: string;
    reference_ad_analysis_summary?: string;
    ad_layout?: Record<string, unknown>;
    text_overlays?: Array<{ type: string; text: string; position: string; style: string }>;
    brand_elements?: Record<string, unknown>;
    strategic_brief?: Record<string, unknown>;
  }>;

  if (concepts.length === 0) throw new Error("No concepts found");

  // Extract store products for product images
  const scrapeData = brand?.store_scrape_data as Record<string, unknown> | null;
  const allProducts = ((scrapeData?.collections || []) as Array<{
    products: Array<{ name: string; images: string[] }>;
  }>).flatMap((c) => c.products);

  const totalImages = concepts.length * 3;

  // Create generated_ads records
  const records = [];
  for (let c = 0; c < concepts.length; c++) {
    for (let v = 1; v <= 3; v++) {
      records.push({
        brand_id: brandId,
        concept_number: c + 1,
        variant_number: v,
        cycle_number: 1,
        prompt_text: concepts[c].image_generation_prompt || "",
        model_used: "gemini-2.5-flash-image",
        seed: Math.floor(Math.random() * 999999),
        generation_status: "pending",
      });
    }
  }

  await supabase.from("generated_ads").insert(records);

  // Generate each image
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const concept = concepts[rec.concept_number - 1];

    if (jobId) {
      await supabase.from("pipeline_jobs").update({
        progress: {
          items_total: totalImages, items_processed: i, items_failed: 0,
          current_item: `Generating "${concept.concept_name || `C${rec.concept_number}`}" V${rec.variant_number}...`,
          percent: Math.round((i / totalImages) * 100),
        },
      }).eq("id", jobId);
    }

    const { data: adRecord } = await supabase
      .from("generated_ads")
      .select("id")
      .eq("brand_id", brandId)
      .eq("concept_number", rec.concept_number)
      .eq("variant_number", rec.variant_number)
      .eq("cycle_number", 1)
      .single();

    if (!adRecord) continue;

    try {
      await supabase.from("generated_ads").update({ generation_status: "generating" }).eq("id", adRecord.id);

      // Build multi-part request with product image + reference ad + prompt
      const parts: Array<Record<string, unknown>> = [];

      // Variant-specific creative directions for genuinely different outputs
      const variantDirections: Record<number, string> = {
        1: `VARIANT STYLE: Clean and minimal. Use plenty of white/negative space. Product centered with elegant typography. Calm, premium feel. Soft lighting with subtle shadows.`,
        2: `VARIANT STYLE: Bold and dynamic. Use strong diagonal composition or asymmetric layout. Vibrant saturated colors. High contrast. Eye-catching and energetic feel. Text can be larger and more impactful.`,
        3: `VARIANT STYLE: Lifestyle-focused. Show the product in context or use. Warm, natural tones. Storytelling composition. Text integrated naturally into the scene. Approachable and relatable mood.`,
      };

      // 1. Main prompt — describe the complete final ad
      const textOverlays = (concept.text_overlays || [])
        .map((t) => `${t.type}: "${t.text}" (${t.position}, ${t.style})`)
        .join("\n");

      const fullPrompt = `Generate a production-ready Meta ad image. This is a FINAL AD, not a product photo.

CONCEPT: "${concept.concept_name || `Concept ${rec.concept_number}`}"
PRODUCT: ${concept.product?.name || "Featured product"} — ${concept.product?.price || ""}

REFERENCE AD INSIGHT: ${concept.reference_ad_analysis_summary || "Follow best-performing ad patterns"}

AD COMPOSITION:
- Format: 1080x1080 square
- Background: ${(concept.ad_layout as Record<string, string>)?.background_style || "clean branded background"}
- Product: ${(concept.ad_layout as Record<string, string>)?.product_placement || "product prominently displayed"}
- Style: ${(concept.ad_layout as Record<string, string>)?.overall_style || "professional"}
- Composition: ${(concept.ad_layout as Record<string, string>)?.composition_rule || "balanced layout"}

TEXT OVERLAYS (render these IN the image):
${textOverlays || "No text overlays"}

BRAND COLORS:
- Primary: ${(concept.brand_elements as Record<string, string>)?.primary_color || "#000000"}
- Accent: ${(concept.brand_elements as Record<string, string>)?.accent_color || "#ffffff"}
- Background: ${(concept.brand_elements as Record<string, string>)?.background_color || ""}
- Text: ${(concept.brand_elements as Record<string, string>)?.text_color || "#ffffff"}
- Logo: ${(concept.brand_elements as Record<string, string>)?.logo_position || "top-left"}, ${(concept.brand_elements as Record<string, string>)?.logo_size || "small"}

FULL CREATIVE BRIEF:
${concept.image_generation_prompt || "Create a high-converting e-commerce ad"}

${variantDirections[rec.variant_number] || ""}

CRITICAL RULES:
1. This is a COMPLETE AD IMAGE — include all text, branding, and product
2. Text must be crisp, readable, and properly positioned
3. Use the exact brand colors specified
4. Product must be the focal point
5. 1080x1080 square format`;

      parts.push({ text: fullPrompt });

      // 2. Try to include product image as reference
      const productImageUrl = concept.product?.image_index !== undefined
        ? allProducts[concept.product.image_index]?.images?.[0]
        : allProducts.find((p) => p.name === concept.product?.name)?.images?.[0];

      if (productImageUrl) {
        try {
          const imgResp = await fetch(productImageUrl);
          if (imgResp.ok) {
            const imgBuffer = await imgResp.arrayBuffer();
            const base64 = Buffer.from(imgBuffer).toString("base64");
            const mimeType = imgResp.headers.get("content-type") || "image/jpeg";
            parts.push({
              text: "Here is the product image to feature in the ad:",
            });
            parts.push({
              inlineData: { mimeType, data: base64 },
            });
          }
        } catch { /* skip if product image fails */ }
      }

      // 3. Try to include reference ad as style guide
      if (concept.reference_ad_url) {
        try {
          const refResp = await fetch(concept.reference_ad_url);
          if (refResp.ok) {
            const refBuffer = await refResp.arrayBuffer();
            const base64 = Buffer.from(refBuffer).toString("base64");
            const mimeType = refResp.headers.get("content-type") || "image/jpeg";
            parts.push({
              text: "Use this reference ad as style/layout inspiration (but create original content):",
            });
            parts.push({
              inlineData: { mimeType, data: base64 },
            });
          }
        } catch { /* skip if reference ad fails */ }
      }

      // Call Gemini image generation
      const imageModel = "gemini-2.5-flash-image";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`;

      const resp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini error ${resp.status}: ${errText.slice(0, 300)}`);
      }

      const data = await resp.json();
      const responseParts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = responseParts.find((p: { inlineData?: { mimeType: string } }) =>
        p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imgPart?.inlineData) throw new Error("No image in response");

      let finalImageBase64 = imgPart.inlineData.data;
      let finalMimeType = imgPart.inlineData.mimeType;
      let totalCost = 0.03;

      // === TWO-PASS REFINEMENT ===
      // Send generated image to gemini-2.5-pro for quality evaluation
      try {
        const evalUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
        const evalResp = await fetch(evalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Evaluate this ad image for quality. Score 1-10 on:
1. Text readability (is all text crisp and readable?)
2. Brand color accuracy (are the specified colors used?)
3. Product visibility (is the product clearly visible?)
4. Overall ad quality (does it look professional and ready to post on Meta?)
5. Composition (is the layout balanced and effective?)

Respond with JSON: {"overall_score": N, "issues": ["issue1", "issue2"], "refinement_prompt": "If score < 7, provide a refined prompt to fix the issues. If score >= 7, set to null."}`
                },
                { inlineData: { mimeType: finalMimeType, data: finalImageBase64 } },
              ],
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
        });

        if (evalResp.ok) {
          const evalData = await evalResp.json();
          const evalText = evalData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          let evalResult: Record<string, unknown> = {};
          try { evalResult = JSON.parse(evalText); } catch { /* ignore parse errors */ }

          const score = Number(evalResult.overall_score) || 10;
          totalCost += 0.005; // evaluation cost

          // If quality is low, regenerate with feedback
          if (score < 7 && evalResult.refinement_prompt) {
            const refinedParts = [
              { text: `REGENERATE this ad with these fixes: ${String(evalResult.refinement_prompt)}\n\nOriginal prompt: ${fullPrompt}` },
              ...parts.filter((p) => (p as Record<string, unknown>).inlineData), // keep reference images
            ];

            const regenResp = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: refinedParts }],
                generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
              }),
            });

            if (regenResp.ok) {
              const regenData = await regenResp.json();
              const regenParts = regenData.candidates?.[0]?.content?.parts || [];
              const regenImg = regenParts.find((p: { inlineData?: { mimeType: string } }) =>
                p.inlineData?.mimeType?.startsWith("image/")
              );
              if (regenImg?.inlineData) {
                finalImageBase64 = regenImg.inlineData.data;
                finalMimeType = regenImg.inlineData.mimeType;
                totalCost += 0.03; // regeneration cost
              }
            }
          }
        }
      } catch { /* refinement is optional — continue with original image */ }

      // Upload final image to storage
      const imgBytes = Buffer.from(finalImageBase64, "base64");
      const ext = finalMimeType === "image/png" ? "png" : "jpg";
      const timestamp = Date.now();
      const storagePath = `${brandId}/concept_${rec.concept_number}/v${rec.variant_number}_${timestamp}.${ext}`;

      await adminClient.storage.from("generated").upload(storagePath, imgBytes, {
        contentType: finalMimeType,
        upsert: true,
      });

      const { data: urlData } = adminClient.storage.from("generated").getPublicUrl(storagePath);

      await supabase.from("generated_ads").update({
        generation_status: "complete",
        raw_image_url: urlData.publicUrl,
        generated_at: new Date().toISOString(),
        cost_usd: totalCost,
      }).eq("id", adRecord.id);

    } catch (err) {
      console.error(`Failed C${rec.concept_number}V${rec.variant_number}:`, (err as Error).message);
      await supabase.from("generated_ads").update({
        generation_status: "failed",
        error_message: (err as Error).message,
      }).eq("id", adRecord.id);
    }
  }

  // Complete
  const { count: completed } = await supabase
    .from("generated_ads")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("generation_status", "complete");

  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      status: "complete", completed_at: new Date().toISOString(),
      progress: { items_total: totalImages, items_processed: completed || 0, items_failed: 0, current_item: null, percent: 100 },
    }).eq("id", jobId);
  }

  await supabase.from("brands").update({ current_stage_status: "review" }).eq("id", brandId);
  return successResponse({ success: true, job_id: jobId, generated: completed });
}

async function processStage8(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  jobId: string,
  selectedModel?: string | null,
  conceptCount?: number
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const totalConcepts = conceptCount || 200;

  // Gather all data
  const { data: brand } = await supabase
    .from("brands")
    .select("brand_dna, creative_intelligence_report, store_scrape_data")
    .eq("id", brandId)
    .single();

  if (!brand?.brand_dna) throw new Error("Brand DNA not found");

  const brandDNA = brand.brand_dna as Record<string, unknown>;
  const report = (brand.creative_intelligence_report || {}) as Record<string, unknown>;
  const scrapeData = brand.store_scrape_data as Record<string, unknown> | null;

  // Get all products
  const allProducts = ((scrapeData?.collections || []) as Array<{
    products: Array<{ name: string; slug: string; price: string; description: string; images: string[] }>;
  }>).flatMap((c) => c.products);

  if (allProducts.length === 0) throw new Error("No products found");

  // Get top reference ads with full analysis
  const { data: topAds } = await supabase
    .from("ad_library_ads")
    .select("id, image_url, analysis, performance_tier")
    .eq("brand_id", brandId)
    .eq("analysis_status", "complete")
    .or("flag.is.null,flag.eq.reference")
    .order("performance_tier", { ascending: true })
    .limit(20);

  const refAds = topAds || [];
  const winningPatterns = (report.winning_creative_patterns || []) as unknown[];
  const failurePatterns = (report.failure_patterns || []) as unknown[];
  const negativeSpace = (brandDNA.negative_brand_space || {}) as Record<string, unknown>;
  const visualIdentity = (brandDNA.visual_identity || {}) as Record<string, unknown>;
  const messaging = (brandDNA.messaging_framework || {}) as Record<string, unknown>;

  // Hook types to rotate through
  const hookTypes = ["scarcity", "social_proof", "bold_claim", "emotional", "curiosity", "price_anchor", "before_after", "testimonial"];

  // Process concepts in batches
  const batchSize = 4; // Generate 4 concept JSONs per AI call
  let generated = 0;

  for (let batchStart = 0; batchStart < totalConcepts; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalConcepts);
    const batchCount = batchEnd - batchStart;

    if (jobId) {
      await supabase.from("pipeline_jobs").update({
        progress: {
          items_total: totalConcepts,
          items_processed: generated,
          items_failed: 0,
          current_item: `Generating concepts ${batchStart + 1}-${batchEnd}/${totalConcepts}...`,
          percent: Math.round((generated / totalConcepts) * 100),
        },
      }).eq("id", jobId);
    }

    // Pick products and hooks for this batch
    const batchProducts: typeof allProducts = [];
    const batchHooks: string[] = [];
    const batchRefs: typeof refAds = [];
    for (let i = batchStart; i < batchEnd; i++) {
      batchProducts.push(allProducts[i % allProducts.length]);
      batchHooks.push(hookTypes[i % hookTypes.length]);
      batchRefs.push(refAds[i % Math.max(refAds.length, 1)]);
    }

    // Build batch concept prompt
    const productList = batchProducts.map((p, i) => {
      const ref = batchRefs[i];
      const refAnalysis = ref?.analysis as Record<string, unknown> | null;
      return `
CONCEPT ${batchStart + i + 1}:
  Product: "${p.name}" — $${p.price} | ${p.description?.slice(0, 80) || ""}
  Hook: ${batchHooks[i]}
  Reference Ad Style: ${(refAnalysis as Record<string, unknown>)?.archetype || "professional"} | ${JSON.stringify((refAnalysis as Record<string, unknown>)?.persuasion_mechanics || {}).slice(0, 200)}
  Reference URL: ${ref?.image_url || "none"}`;
    }).join("\n");

    const batchPrompt = `Generate ${batchCount} production-ready Meta ad concepts.

BRAND: ${JSON.stringify(brandDNA.brand_identity || {}).slice(0, 300)}
COLORS: Primary ${JSON.stringify(visualIdentity.primary_colors || [])} | Accent ${JSON.stringify(visualIdentity.accent_colors || [])}
TONE: ${String(messaging.tone_of_voice || "professional")}
WINNING PATTERNS: ${winningPatterns.slice(0, 3).map((p) => typeof p === "string" ? p : JSON.stringify(p).slice(0, 100)).join(" | ")}
AVOID: ${failurePatterns.slice(0, 2).map((p) => typeof p === "string" ? p : JSON.stringify(p).slice(0, 80)).join(" | ")}
NEGATIVE SPACE: ${JSON.stringify(negativeSpace).slice(0, 200)}

CONCEPTS TO GENERATE:
${productList}

For each concept return: concept_number, concept_name, product {name, price}, reference_ad_url, strategic_brief {objective, target_emotion, funnel_stage, hook_type, key_message}, ad_layout {format:"1080x1080", background_style, product_placement, overall_style}, text_overlays [{type, text, position, style}], brand_elements {primary_color, accent_color, logo_position}, image_generation_prompt (150 words describing the COMPLETE FINAL AD).

Return JSON: {"concepts": [...]}`;

    try {
      const geminiModel = selectedModel === "gemini-2.5-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";
      const conceptResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: batchPrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 8192, responseMimeType: "application/json" },
          }),
        }
      );

      if (!conceptResp.ok) {
        console.error(`Batch concept gen failed: ${conceptResp.status}`);
        continue;
      }

      const conceptData = await conceptResp.json();
      const conceptText = conceptData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let parsedConcepts: Record<string, unknown>;
      try { parsedConcepts = JSON.parse(conceptText); }
      catch { const m = conceptText.match(/\{[\s\S]*\}/); parsedConcepts = m ? JSON.parse(m[0]) : {}; }

      const concepts = ((parsedConcepts as { concepts?: unknown[] }).concepts || []) as Array<Record<string, unknown>>;

      // Generate image for each concept in this batch
      for (let ci = 0; ci < concepts.length; ci++) {
        const concept = concepts[ci];
        const conceptNum = batchStart + ci + 1;
        const product = batchProducts[ci];

        // Create DB record
        const { data: adRecord } = await supabase
          .from("generated_ads")
          .insert({
            brand_id: brandId,
            concept_number: conceptNum,
            variant_number: 1,
            cycle_number: 2, // bulk cycle
            prompt_text: String(concept.image_generation_prompt || ""),
            model_used: "gemini-2.5-flash-image",
            seed: Math.floor(Math.random() * 999999),
            generation_status: "generating",
          })
          .select("id")
          .single();

        if (!adRecord) continue;

        try {
          // Build image generation parts
          const imgParts: Array<Record<string, unknown>> = [
            { text: `Generate a production-ready Meta ad. ${String(concept.image_generation_prompt || "")}` },
          ];

          // Add product image
          const productImg = product.images?.[0];
          if (productImg) {
            try {
              const pResp = await fetch(productImg);
              if (pResp.ok) {
                const pBuf = await pResp.arrayBuffer();
                imgParts.push({ text: "Product image:" });
                imgParts.push({ inlineData: { mimeType: pResp.headers.get("content-type") || "image/jpeg", data: Buffer.from(pBuf).toString("base64") } });
              }
            } catch {}
          }

          // Generate image
          const imgResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: imgParts }],
                generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
              }),
            }
          );

          if (!imgResp.ok) throw new Error(`Image gen failed: ${imgResp.status}`);

          const imgData = await imgResp.json();
          const imgPartResult = (imgData.candidates?.[0]?.content?.parts || []).find(
            (p: { inlineData?: { mimeType: string } }) => p.inlineData?.mimeType?.startsWith("image/")
          );

          if (!imgPartResult?.inlineData) throw new Error("No image");

          // Upload
          const bytes = Buffer.from(imgPartResult.inlineData.data, "base64");
          const ext = imgPartResult.inlineData.mimeType === "image/png" ? "png" : "jpg";
          const path = `${brandId}/bulk/c${conceptNum}_${Date.now()}.${ext}`;

          await adminClient.storage.from("generated").upload(path, bytes, {
            contentType: imgPartResult.inlineData.mimeType,
            upsert: true,
          });

          const { data: urlData } = adminClient.storage.from("generated").getPublicUrl(path);

          await supabase.from("generated_ads").update({
            generation_status: "complete",
            raw_image_url: urlData.publicUrl,
            generated_at: new Date().toISOString(),
            cost_usd: 0.03,
          }).eq("id", adRecord.id);

          generated++;
        } catch (err) {
          console.error(`Bulk C${conceptNum} failed:`, (err as Error).message);
          await supabase.from("generated_ads").update({
            generation_status: "failed",
            error_message: (err as Error).message,
          }).eq("id", adRecord.id);
        }
      }
    } catch (err) {
      console.error(`Batch ${batchStart}-${batchEnd} failed:`, (err as Error).message);
    }
  }

  // Complete
  if (jobId) {
    await supabase.from("pipeline_jobs").update({
      status: "complete", completed_at: new Date().toISOString(),
      progress: { items_total: totalConcepts, items_processed: generated, items_failed: 0, current_item: null, percent: 100 },
    }).eq("id", jobId);
  }

  await supabase.from("brands").update({ current_stage_status: "review" }).eq("id", brandId);
  return successResponse({ success: true, job_id: jobId, generated });
}
