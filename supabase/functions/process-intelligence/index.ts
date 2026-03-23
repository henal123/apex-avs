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
 * Stage 5: Intelligence Synthesis
 * Aggregates all ad analyses + Brand DNA into a strategic intelligence report.
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
      current_item: "Gathering analyses...", percent: 10,
    });

    // Get brand DNA
    const { data: brand } = await supabase
      .from("brands")
      .select("brand_dna")
      .eq("id", brandId)
      .single();

    if (!brand?.brand_dna) throw new Error("Brand DNA not found");

    // Get all completed analyses (excluding ignored)
    const { data: ads } = await supabase
      .from("ad_library_ads")
      .select("analysis, source_type, performance_tier, archetype:analysis->archetype")
      .eq("brand_id", brandId)
      .eq("analysis_status", "complete")
      .neq("flag", "ignore");

    if (!ads || ads.length === 0) throw new Error("No analyzed ads found");

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Synthesizing intelligence report...", percent: 30,
    });

    // Build prompt
    const analysesJson = JSON.stringify(
      ads.map((a) => a.analysis).slice(0, 50),
      null,
      2
    ).slice(0, 30000); // Limit context size

    const prompt = `You are a creative strategist. Synthesize ad analysis data into a strategic intelligence report.

## Brand DNA
${JSON.stringify(brand.brand_dna).slice(0, 5000)}

## Ad Analyses (${ads.length} ads)
${analysesJson}

Generate a JSON report with: winning_creative_patterns, creative_archetype_clusters, competitive_creative_intelligence (gaps/opportunities/threats), failure_patterns, and strategic_recommendations containing four_ad_concept_directions (4 concepts with name, archetype, hook_type, funnel_stage, rationale, supporting_patterns) and general_recommendations.

Respond with ONLY the JSON object.`;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

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
      throw new Error(`Gemini API error: ${geminiResp.status}`);
    }

    const geminiData = await geminiResp.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = geminiData.usageMetadata || {};

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 0, items_failed: 0,
      current_item: "Saving report...", percent: 80,
    });

    let report: Record<string, unknown>;
    try {
      report = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      report = match ? JSON.parse(match[0]) : {};
    }

    // Save
    await supabase
      .from("brands")
      .update({ creative_intelligence_report: report })
      .eq("id", brandId);

    await logApiCost({
      brand_id: brandId,
      service: "gemini",
      model: "gemini-2.5-pro",
      stage: 5,
      cost_usd: ((usage.promptTokenCount || 0) * 0.00000125) + ((usage.candidatesTokenCount || 0) * 0.000005),
      tokens_input: usage.promptTokenCount || 0,
      tokens_output: usage.candidatesTokenCount || 0,
    });

    await updateJobProgress(jobId, {
      items_total: 1, items_processed: 1, items_failed: 0,
      current_item: null, percent: 100,
    });
    await completeJob(jobId, { patterns: Object.keys(report) });
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
