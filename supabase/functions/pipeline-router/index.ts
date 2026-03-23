import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * Pipeline Router - triggered by database webhook on pipeline_jobs INSERT.
 * Routes to the appropriate stage handler Edge Function.
 */

const STAGE_FUNCTIONS: Record<number, string> = {
  1: "process-scrape",
  2: "process-brand-dna",
  // Stage 3 is manual (ad library upload) - no function
  4: "process-ad-analysis",
  5: "process-intelligence",
  6: "process-concepts",
  7: "process-image-gen",
  // Stage 8 is manual (compositing) - no function
  9: "process-qa",
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = await req.json();

    // Database webhook payload contains the new row
    const record = payload.record || payload;
    const jobId = record.id;
    const stage = record.stage;
    const status = record.status;

    // Only process newly queued jobs
    if (status !== "queued") {
      return new Response(
        JSON.stringify({ message: "Skipped - not a queued job" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const functionName = STAGE_FUNCTIONS[stage];
    if (!functionName) {
      return new Response(
        JSON.stringify({ message: `No handler for stage ${stage}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invoke the stage-specific Edge Function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_id: jobId }),
    });

    const result = await response.text();

    return new Response(
      JSON.stringify({
        message: `Routed to ${functionName}`,
        job_id: jobId,
        stage,
        response_status: response.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
