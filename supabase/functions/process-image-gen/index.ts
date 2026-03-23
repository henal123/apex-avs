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
 * Stage 7: Image Generation
 * Generates 3 variants per concept (12 total) using selected image model.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let jobId = "";

  try {
    const { job_id } = await req.json();
    jobId = job_id;

    const supabase = getSupabaseAdmin();
    const { data: job } = await supabase.from("pipeline_jobs").select("*").eq("id", jobId).single();
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const brandId = job.brand_id;
    if (job.status === "queued") await startJob(jobId);

    // Get concepts
    const { data: brand } = await supabase
      .from("brands")
      .select("ad_concepts")
      .eq("id", brandId)
      .single();

    const concepts = (brand?.ad_concepts || []) as Array<{
      concept_number?: number;
      image_generation_prompt: string;
      technical_specifications?: { guidance_scale?: number; steps?: number };
    }>;

    if (concepts.length === 0) throw new Error("No concepts found");

    const totalImages = concepts.length * 3;

    // Check for pending variants
    const { data: pendingVariants } = await supabase
      .from("generated_ads")
      .select("id")
      .eq("brand_id", brandId)
      .eq("generation_status", "pending")
      .limit(3);

    // If no pending, create records for all variants
    if (!pendingVariants || pendingVariants.length === 0) {
      const { count: existing } = await supabase
        .from("generated_ads")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId);

      if (!existing || existing === 0) {
        const records = [];
        for (let c = 0; c < concepts.length; c++) {
          for (let v = 1; v <= 3; v++) {
            records.push({
              brand_id: brandId,
              concept_number: c + 1,
              variant_number: v,
              cycle_number: 1,
              prompt_text: concepts[c].image_generation_prompt,
              model_used: (job.config as Record<string, string>)?.model || "nano-banana-pro",
              seed: Math.floor(Math.random() * 999999),
              generation_status: "pending",
            });
          }
        }
        await supabase.from("generated_ads").insert(records);
      }
    }

    // Process pending variants (2 at a time)
    const { data: toGenerate } = await supabase
      .from("generated_ads")
      .select("*")
      .eq("brand_id", brandId)
      .eq("generation_status", "pending")
      .limit(2);

    if (!toGenerate || toGenerate.length === 0) {
      // All done
      const { count: complete } = await supabase
        .from("generated_ads")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("generation_status", "complete");

      await updateJobProgress(jobId, {
        items_total: totalImages, items_processed: complete || 0,
        items_failed: 0, current_item: null, percent: 100,
      });
      await completeJob(jobId, { total_generated: complete });
      await updateBrandStageStatus(brandId, "review");

      return new Response(JSON.stringify({ success: true, complete: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    for (const variant of toGenerate) {
      await supabase.from("generated_ads").update({ generation_status: "generating" }).eq("id", variant.id);

      const { count: done } = await supabase
        .from("generated_ads")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .in("generation_status", ["complete", "generating"]);

      await updateJobProgress(jobId, {
        items_total: totalImages, items_processed: done || 0,
        items_failed: 0,
        current_item: `Generating concept ${variant.concept_number} variant ${variant.variant_number}...`,
        percent: Math.round(((done || 0) / totalImages) * 100),
      });

      try {
        // Call Gemini image generation
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate a high-quality ad image. ${variant.prompt_text}` }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        });

        if (!resp.ok) throw new Error(`Image gen failed: ${resp.status}`);

        const data = await resp.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: { inlineData?: { mimeType: string } }) =>
          p.inlineData?.mimeType?.startsWith("image/"));

        if (!imgPart?.inlineData) throw new Error("No image in response");

        // Upload to storage
        const imgBytes = Uint8Array.from(atob(imgPart.inlineData.data), (c) => c.charCodeAt(0));
        const ext = imgPart.inlineData.mimeType === "image/png" ? "png" : "jpg";
        const path = `${brandId}/cycle_1/concept_${variant.concept_number}/variant_${variant.variant_number}_raw.${ext}`;

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        await fetch(`${supabaseUrl}/storage/v1/object/generated/${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": imgPart.inlineData.mimeType,
            "x-upsert": "true",
          },
          body: imgBytes,
        });

        const { data: urlData } = supabase.storage.from("generated").getPublicUrl(path);

        await supabase.from("generated_ads").update({
          generation_status: "complete",
          raw_image_url: urlData.publicUrl,
          generated_at: new Date().toISOString(),
          cost_usd: 0.03,
        }).eq("id", variant.id);

        await logApiCost({
          brand_id: brandId, service: "image_gen",
          model: variant.model_used, stage: 7, cost_usd: 0.03,
        });

      } catch (error) {
        await supabase.from("generated_ads").update({
          generation_status: "failed",
          error_message: (error as Error).message,
        }).eq("id", variant.id);
      }
    }

    // Check remaining
    const { count: remaining } = await supabase
      .from("generated_ads")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("generation_status", "pending");

    if (remaining && remaining > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${supabaseUrl}/functions/v1/process-image-gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ job_id: jobId }),
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, remaining, continuing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Complete
    const { count: finalComplete } = await supabase
      .from("generated_ads").select("*", { count: "exact", head: true })
      .eq("brand_id", brandId).eq("generation_status", "complete");

    await updateJobProgress(jobId, {
      items_total: totalImages, items_processed: finalComplete || 0,
      items_failed: 0, current_item: null, percent: 100,
    });
    await completeJob(jobId, { total_generated: finalComplete });
    await updateBrandStageStatus(brandId, "review");

    return new Response(JSON.stringify({ success: true, complete: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const message = (error as Error).message;
    if (jobId) {
      await failJob(jobId, message);
      const supabase = getSupabaseAdmin();
      const { data: job } = await supabase.from("pipeline_jobs").select("brand_id").eq("id", jobId).single();
      if (job) await updateBrandStageStatus(job.brand_id, "failed");
    }
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
