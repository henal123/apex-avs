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

const BATCH_SIZE = 5;

/**
 * Stage 4: Batch Ad Analysis
 * Processes ads in batches of 5, self-invokes for remaining ads.
 * Uses Gemini 2.0 Flash for 50+ dimension analysis per ad.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let jobId = "";

  try {
    const { job_id } = await req.json();
    jobId = job_id;

    const supabase = getSupabaseAdmin();

    // Get job
    const { data: job } = await supabase
      .from("pipeline_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error(`Job not found: ${jobId}`);

    const brandId = job.brand_id;

    // Start job if first invocation
    if (job.status === "queued") {
      await startJob(jobId);
    }

    // Get brand DNA for context
    const { data: brand } = await supabase
      .from("brands")
      .select("brand_dna")
      .eq("id", brandId)
      .single();

    // Get pending ads (not yet analyzed, not ignored)
    // Prioritize: winners/reference first, then by upload order
    const { data: pendingAds } = await supabase
      .from("ad_library_ads")
      .select("id, image_url, source_type, performance_tier, flag")
      .eq("brand_id", brandId)
      .eq("analysis_status", "pending")
      .neq("flag", "ignore")
      .order("performance_tier", { ascending: true }) // winners first
      .order("uploaded_at", { ascending: true })
      .limit(BATCH_SIZE);

    // Get total counts for progress
    const { count: totalPending } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .neq("flag", "ignore");

    const { count: totalComplete } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("analysis_status", "complete");

    const { count: totalFailed } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("analysis_status", "failed");

    const total = totalPending || 0;
    const processed = totalComplete || 0;
    const failed = totalFailed || 0;

    if (!pendingAds || pendingAds.length === 0) {
      // All done
      await updateJobProgress(jobId, {
        items_total: total,
        items_processed: processed,
        items_failed: failed,
        current_item: null,
        percent: 100,
      });
      await completeJob(jobId, { total_analyzed: processed, total_failed: failed });
      await updateBrandStageStatus(brandId, "review");

      return new Response(
        JSON.stringify({ success: true, complete: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build analysis prompt
    const dnaContext = brand?.brand_dna
      ? `\n## Brand DNA Context\n${JSON.stringify(brand.brand_dna).slice(0, 2000)}\n`
      : "";

    const analysisPrompt = `You are an expert ad creative analyst. Analyze this ad image in detail.
${dnaContext}
Score dimensions from 1-10 and classify the ad. Respond with ONLY a JSON object containing:
layout_architecture, typography_analysis, color_analysis, product_presentation, human_element, persuasion_mechanics, overall_scores, archetype, archetype_traits, patterns, competitive_gaps.

Each category should have scored sub-fields (1-10) and descriptive strings.`;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    // Process batch
    for (let i = 0; i < pendingAds.length; i++) {
      const ad = pendingAds[i];

      await updateJobProgress(jobId, {
        items_total: total,
        items_processed: processed + i,
        items_failed: failed,
        current_item: `Analyzing ad ${processed + i + 1}/${total}...`,
        percent: Math.round(((processed + i) / total) * 100),
      });

      // Mark as processing
      await supabase
        .from("ad_library_ads")
        .update({ analysis_status: "processing" })
        .eq("id", ad.id);

      try {
        // Download image and convert to base64
        const imageResp = await fetch(ad.image_url);
        if (!imageResp.ok) throw new Error("Failed to download image");

        const imageBuffer = await imageResp.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        const contentType = imageResp.headers.get("content-type") || "image/jpeg";

        // Call Gemini 2.0 Flash
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const geminiResp = await fetch(geminiUrl, {
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
        });

        if (!geminiResp.ok) {
          throw new Error(`Gemini API error: ${geminiResp.status}`);
        }

        const geminiData = await geminiResp.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const usage = geminiData.usageMetadata || {};

        // Parse analysis
        let analysis: Record<string, unknown>;
        try {
          analysis = JSON.parse(responseText);
        } catch {
          const match = responseText.match(/\{[\s\S]*\}/);
          analysis = match ? JSON.parse(match[0]) : {};
        }

        // Save analysis
        await supabase
          .from("ad_library_ads")
          .update({
            analysis,
            analysis_status: "complete",
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", ad.id);

        // Log cost
        await logApiCost({
          brand_id: brandId,
          service: "gemini",
          model: "gemini-2.5-flash",
          stage: 4,
          cost_usd: ((usage.promptTokenCount || 0) * 0.0000001) + ((usage.candidatesTokenCount || 0) * 0.0000004),
          tokens_input: usage.promptTokenCount || 0,
          tokens_output: usage.candidatesTokenCount || 0,
        });

      } catch (error) {
        console.error(`Failed to analyze ad ${ad.id}:`, (error as Error).message);
        await supabase
          .from("ad_library_ads")
          .update({ analysis_status: "failed" })
          .eq("id", ad.id);
      }
    }

    // Check if more ads remain
    const { count: remaining } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("analysis_status", "pending")
      .neq("flag", "ignore");

    if (remaining && remaining > 0) {
      // Self-invoke for next batch
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      fetch(`${supabaseUrl}/functions/v1/process-ad-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      }).catch(() => {
        // Fire and forget - if self-invoke fails, frontend can re-trigger
      });

      return new Response(
        JSON.stringify({ success: true, remaining, continuing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All done
    const { count: finalComplete } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("analysis_status", "complete");

    const { count: finalFailed } = await supabase
      .from("ad_library_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("analysis_status", "failed");

    await updateJobProgress(jobId, {
      items_total: total,
      items_processed: finalComplete || 0,
      items_failed: finalFailed || 0,
      current_item: null,
      percent: 100,
    });
    await completeJob(jobId, {
      total_analyzed: finalComplete || 0,
      total_failed: finalFailed || 0,
    });
    await updateBrandStageStatus(brandId, "review");

    return new Response(
      JSON.stringify({ success: true, complete: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error(`Stage 4 failed for job ${jobId}:`, message);

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
