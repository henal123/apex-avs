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

/**
 * Stage 9: QA Checks
 * Runs automated quality checks on selected composited images.
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
    await startJob(jobId);

    // Get selected ads
    const { data: selectedAds } = await supabase
      .from("generated_ads")
      .select("*")
      .eq("brand_id", brandId)
      .eq("is_selected", true);

    const ads = selectedAds || [];
    const total = ads.length;

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      await updateJobProgress(jobId, {
        items_total: total, items_processed: i, items_failed: 0,
        current_item: `QA check ${i + 1}/${total}...`,
        percent: Math.round((i / total) * 100),
      });

      const checks = [];
      const imageUrl = ad.final_image_url || ad.raw_image_url;

      // Check 1: Image exists
      checks.push({
        name: "image_exists",
        passed: !!imageUrl,
        message: imageUrl ? "Image URL present" : "No image URL",
        severity: "error",
      });

      // Check 2: File size (check via HEAD request)
      if (imageUrl) {
        try {
          const headResp = await fetch(imageUrl, { method: "HEAD" });
          const size = parseInt(headResp.headers.get("content-length") || "0");
          const underLimit = size < 5 * 1024 * 1024;
          checks.push({
            name: "file_size",
            passed: underLimit,
            message: underLimit ? `${(size / 1024).toFixed(0)}KB` : `${(size / 1024 / 1024).toFixed(1)}MB exceeds 5MB`,
            severity: underLimit ? "info" : "error",
          });
        } catch {
          checks.push({ name: "file_size", passed: false, message: "Could not check", severity: "warning" });
        }
      }

      // Check 3: Has compositing spec (text overlays applied)
      const hasCompositing = !!ad.compositing_spec;
      checks.push({
        name: "compositing_applied",
        passed: hasCompositing,
        message: hasCompositing ? "Text overlays composited" : "No compositing applied",
        severity: "warning",
      });

      // Check 4: Concept assignment
      checks.push({
        name: "concept_assigned",
        passed: ad.concept_number >= 1 && ad.concept_number <= 4,
        message: `Concept ${ad.concept_number}`,
        severity: "info",
      });

      const allPassed = checks.every((c) => c.severity !== "error" || c.passed);

      await supabase.from("generated_ads").update({
        qa_result: { checks, passed: allPassed, overrides: [] },
        qa_passed: allPassed,
      }).eq("id", ad.id);
    }

    await updateJobProgress(jobId, {
      items_total: total, items_processed: total, items_failed: 0,
      current_item: null, percent: 100,
    });
    await completeJob(jobId, { total_checked: total });
    await updateBrandStageStatus(brandId, "review");

    return new Response(JSON.stringify({ success: true }),
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
