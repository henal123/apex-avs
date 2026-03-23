import { getSupabaseAdmin } from "./supabase-client.ts";

interface CostLogEntry {
  brand_id: string;
  service: "gemini" | "claude" | "image_gen" | "sharp_rendering";
  model: string;
  stage: number;
  cost_usd: number;
  tokens_input?: number;
  tokens_output?: number;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export async function logApiCost(entry: CostLogEntry) {
  const supabase = getSupabaseAdmin();
  await supabase.from("api_cost_logs").insert({
    brand_id: entry.brand_id,
    service: entry.service,
    model: entry.model,
    stage: entry.stage,
    cost_usd: entry.cost_usd,
    tokens_input: entry.tokens_input ?? 0,
    tokens_output: entry.tokens_output ?? 0,
    duration_ms: entry.duration_ms ?? 0,
    metadata: entry.metadata ?? {},
    date: new Date().toISOString().split("T")[0],
  });
}
