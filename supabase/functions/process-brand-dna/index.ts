import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-client.ts";
import {
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
  updateBrandStageStatus,
} from "../_shared/job-manager.ts";
import { logApiCost } from "../_shared/cost-logger.ts";

/**
 * Stage 2: Brand DNA Generation
 * Calls Gemini 2.5 Pro to synthesize Brand DNA from store scrape data.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let jobId = "";

  try {
    const { job_id } = await req.json();
    jobId = job_id;

    const supabase = getSupabaseAdmin();

    // Get job and brand data
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .select("*, brands!inner(id, store_scrape_data)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) throw new Error(`Job not found: ${jobId}`);

    const brandId = job.brand_id;
    const scrapeData = job.brands.store_scrape_data;

    if (!scrapeData) throw new Error("No scrape data available for Brand DNA generation");

    await startJob(jobId);
    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Generating Brand DNA...", percent: 10,
    });

    // Build prompt
    const productSample = (scrapeData.collections || [])
      .flatMap((c: { products?: Array<{ name: string; price: string; description?: string }> }) => c.products || [])
      .slice(0, 10)
      .map((p: { name: string; price: string; description?: string }) =>
        `- ${p.name}: $${p.price} — ${(p.description || "").slice(0, 100)}`
      )
      .join("\n");

    const colors = (scrapeData.branding?.colors || []).join(", ") || "None";
    const fonts = (scrapeData.branding?.fonts || []).join(", ") || "None";
    const collections = (scrapeData.collections || [])
      .map((c: { name: string; products?: unknown[] }) =>
        `- ${c.name} (${(c.products || []).length} products)`
      )
      .join("\n");

    const prompt = `You are a brand strategist analyzing an e-commerce store. Generate a comprehensive Brand DNA.

## Store Information
- Store Name: ${scrapeData.store_name || "Unknown"}
- URL: ${scrapeData.store_url || ""}
- Platform: ${scrapeData.platform || "unknown"}
- Tagline: ${scrapeData.tagline || "None"}
- Description: ${scrapeData.description || "None"}

## Products (Sample)
${productSample || "No products found"}

## Branding
- Colors: ${colors}
- Fonts: ${fonts}

## Collections
${collections || "None"}

Generate a comprehensive Brand DNA as a JSON object with these sections:
brand_identity, target_audience, visual_identity, messaging_framework, competitive_positioning, negative_brand_space, ad_creative_directives.

Each section should contain arrays and strings with specific, actionable content derived from the store data above. Respond with ONLY the JSON object.`;

    // Call Gemini 2.5 Pro
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
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

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API error (${geminiResponse.status}): ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = geminiData.usageMetadata || {};

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Parsing response...", percent: 70,
    });

    // Parse Brand DNA
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

    // Validate required sections exist
    const requiredSections = [
      "brand_identity", "target_audience", "visual_identity",
      "messaging_framework", "competitive_positioning",
      "negative_brand_space", "ad_creative_directives",
    ];
    for (const section of requiredSections) {
      if (!brandDNA[section]) {
        brandDNA[section] = {};
      }
    }

    // Save Brand DNA
    const { error: updateError } = await supabase
      .from("brands")
      .update({
        brand_dna: brandDNA,
        brand_dna_version: 1,
      })
      .eq("id", brandId);

    if (updateError) throw new Error(`Failed to save Brand DNA: ${updateError.message}`);

    // Log cost
    await logApiCost({
      brand_id: brandId,
      service: "gemini",
      model: "gemini-2.5-pro",
      stage: 2,
      cost_usd: ((usage.promptTokenCount || 0) * 0.00000125) + ((usage.candidatesTokenCount || 0) * 0.000005),
      tokens_input: usage.promptTokenCount || 0,
      tokens_output: usage.candidatesTokenCount || 0,
    });

    // Complete
    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 1, items_failed: 0,
      current_item: null, percent: 100,
    });
    await completeJob(jobId, { sections: Object.keys(brandDNA) });
    await updateBrandStageStatus(brandId, "review");

    return new Response(
      JSON.stringify({ success: true, job_id: jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error(`Stage 2 failed for job ${jobId}:`, message);

    if (jobId) {
      await failJob(jobId, message);
      const supabase = getSupabaseAdmin();
      const { data: job } = await supabase
        .from("pipeline_jobs")
        .select("brand_id")
        .eq("id", jobId)
        .single();
      if (job) await updateBrandStageStatus(job.brand_id, "failed");
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
