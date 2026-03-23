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
 * Stage 6: Ad Concept & Prompt Generation
 * Uses Claude to generate 4 detailed ad concept specs from intelligence report.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let jobId = "";

  try {
    const { job_id } = await req.json();
    jobId = job_id;

    const supabase = getSupabaseAdmin();

    const { data: job } = await supabase
      .from("pipeline_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error(`Job not found: ${jobId}`);
    const brandId = job.brand_id;

    await startJob(jobId);
    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Generating ad concepts...", percent: 10,
    });

    // Get brand data
    const { data: brand } = await supabase
      .from("brands")
      .select("brand_dna, creative_intelligence_report")
      .eq("id", brandId)
      .single();

    if (!brand?.brand_dna) throw new Error("Brand DNA not found");
    if (!brand?.creative_intelligence_report) throw new Error("Intelligence report not found");

    const report = brand.creative_intelligence_report as Record<string, unknown>;
    const directions = (report.strategic_recommendations as Record<string, unknown>)?.four_ad_concept_directions || [];

    const prompt = `You are an expert ad creative director. Generate 4 detailed ad concept specifications for image generation.

## Brand DNA
${JSON.stringify(brand.brand_dna).slice(0, 4000)}

## Strategic Concept Directions
${JSON.stringify(directions).slice(0, 3000)}

For each of the 4 concept directions, create a complete specification. Return a JSON object:

{
  "concepts": [
    {
      "concept_number": 1,
      "strategic_brief": {
        "concept_name": "string",
        "objective": "string",
        "target_emotion": "string",
        "key_message": "string",
        "cta": "string"
      },
      "image_generation_prompt": "50-100 word detailed prompt for AI image generation",
      "prompt_structure": {
        "style": "string",
        "composition": "string",
        "mood": "string",
        "lighting": "string",
        "color_palette": ["#hex1", "#hex2"],
        "product_placement": "string",
        "background": "string"
      },
      "text_overlays": [
        {"type": "headline", "text": "string", "position": {"x": 0.5, "y": 0.15}, "style": {"fontSize": 48, "fontWeight": "bold", "color": "#ffffff", "textCase": "uppercase"}},
        {"type": "cta", "text": "string", "position": {"x": 0.5, "y": 0.85}, "style": {"fontSize": 20, "fontWeight": "bold", "color": "#ffffff", "textCase": "uppercase"}}
      ],
      "brand_elements": {
        "logo_position": "top-left",
        "logo_size": "small",
        "brand_colors_usage": "string"
      },
      "technical_specifications": {
        "resolution": "1080x1080",
        "aspect_ratio": "1:1",
        "guidance_scale": 7.5,
        "steps": 30
      },
      "quality_checklist": ["check1", "check2", "check3"]
    }
  ]
}

Generate all 4 concepts. Respond with ONLY the JSON.`;

    // Call Claude
    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeKey) throw new Error("CLAUDE_API_KEY not configured");

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Claude is crafting concepts...", percent: 40,
    });

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.7,
        system: "You are an expert ad creative strategist. Respond with valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResp.ok) {
      throw new Error(`Claude API error: ${claudeResp.status}`);
    }

    const claudeData = await claudeResp.json();
    const responseText = claudeData.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";
    const usage = claudeData.usage || {};

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Saving concepts...", percent: 80,
    });

    let conceptsData: Record<string, unknown>;
    try {
      conceptsData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      conceptsData = match ? JSON.parse(match[0]) : {};
    }

    const concepts = (conceptsData as { concepts?: unknown[] }).concepts || [];

    // Save concepts
    await supabase
      .from("brands")
      .update({ ad_concepts: concepts })
      .eq("id", brandId);

    await logApiCost({
      brand_id: brandId,
      service: "claude",
      model: "claude-sonnet",
      stage: 6,
      cost_usd: ((usage.input_tokens || 0) * 0.000003) + ((usage.output_tokens || 0) * 0.000015),
      tokens_input: usage.input_tokens || 0,
      tokens_output: usage.output_tokens || 0,
    });

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 1, items_failed: 0,
      current_item: null, percent: 100,
    });
    await completeJob(jobId, { concepts_count: concepts.length });
    await updateBrandStageStatus(brandId, "review");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = (error as Error).message;
    if (jobId) {
      await failJob(jobId, message);
      const supabase = getSupabaseAdmin();
      const { data: job } = await supabase.from("pipeline_jobs").select("brand_id").eq("id", jobId).single();
      if (job) await updateBrandStageStatus(job.brand_id, "failed");
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
