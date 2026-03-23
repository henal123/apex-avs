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
 * Stage 1: Store Scraping
 * Calls the Python scraper service, stores results in brand record.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let jobId = "";

  try {
    const { job_id } = await req.json();
    jobId = job_id;

    const supabase = getSupabaseAdmin();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .select("*, brands!inner(id, store_url)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const brandId = job.brand_id;
    const storeUrl = job.brands.store_url;

    // Mark job as processing
    await startJob(jobId);
    await updateJobProgress(jobId, {
      items_total: 1,
      items_processed: 0,
      items_failed: 0,
      current_item: "Scraping store...",
      percent: 10,
    });

    // Call Python scraper
    const scraperUrl = Deno.env.get("PYTHON_SCRAPER_URL") || "http://localhost:8000";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const scrapeResponse = await fetch(`${scraperUrl}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": Deno.env.get("SCRAPER_SERVICE_KEY") || "",
      },
      body: JSON.stringify({
        store_url: storeUrl,
        brand_id: brandId,
        supabase_url: supabaseUrl,
        supabase_key: serviceKey,
        upload_assets: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      throw new Error(`Scraper failed (${scrapeResponse.status}): ${errorText}`);
    }

    const scrapeResult = await scrapeResponse.json();

    await updateJobProgress(jobId, {
      items_total: 1,
      items_processed: 0,
      items_failed: 0,
      current_item: "Saving results...",
      percent: 80,
    });

    // Store scrape data on brand
    const { error: updateError } = await supabase
      .from("brands")
      .update({
        store_scrape_data: scrapeResult.data,
      })
      .eq("id", brandId);

    if (updateError) {
      throw new Error(`Failed to save scrape data: ${updateError.message}`);
    }

    // Create brand_assets records for uploaded files
    const scrapeData = scrapeResult.data;
    const assetRecords: Array<Record<string, unknown>> = [];

    // Logo asset
    if (scrapeData.branding?.logo_url) {
      assetRecords.push({
        brand_id: brandId,
        asset_type: "logo",
        file_name: "logo",
        file_path: scrapeData.branding.logo_url,
        metadata: { source: "scrape" },
      });
    }

    // Product image assets
    for (const collection of scrapeData.collections || []) {
      for (const product of collection.products || []) {
        for (const img of product.images || []) {
          assetRecords.push({
            brand_id: brandId,
            asset_type: "product_image",
            file_name: product.name || product.slug,
            file_path: img,
            metadata: {
              collection: collection.slug,
              product: product.slug,
              source: "scrape",
            },
          });
        }
      }
    }

    if (assetRecords.length > 0) {
      await supabase.from("brand_assets").insert(assetRecords);
    }

    // Complete job
    await updateJobProgress(jobId, {
      items_total: 1,
      items_processed: 1,
      items_failed: 0,
      current_item: null,
      percent: 100,
    });

    await completeJob(jobId, {
      assets_uploaded: scrapeResult.assets_uploaded,
      platform: scrapeData.platform,
      collections_count: (scrapeData.collections || []).length,
      products_count: (scrapeData.collections || []).reduce(
        (sum: number, c: { products?: unknown[] }) => sum + (c.products?.length || 0),
        0
      ),
    });

    // Set brand stage to review
    await updateBrandStageStatus(brandId, "review");

    return new Response(
      JSON.stringify({ success: true, job_id: jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error(`Stage 1 failed for job ${jobId}:`, message);

    if (jobId) {
      await failJob(jobId, message);
      // Get brand_id from job to update status
      const supabase = getSupabaseAdmin();
      const { data: job } = await supabase
        .from("pipeline_jobs")
        .select("brand_id")
        .eq("id", jobId)
        .single();
      if (job) {
        await updateBrandStageStatus(job.brand_id, "failed");
      }
    }

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
