export type CostService = "gemini" | "claude" | "image_gen" | "sharp_rendering";

export interface CostLog {
  id: string;
  brand_id: string;
  org_id: string | null;
  service: CostService;
  model: string;
  stage: number;
  cost_usd: number;
  tokens_input: number;
  tokens_output: number;
  duration_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
  date: string;
}

export interface CostSummary {
  total_cost: number;
  by_service: Record<CostService, number>;
  by_model: Record<string, number>;
  by_stage: Record<number, number>;
  by_date: { date: string; cost: number }[];
}

export interface BrandCostSummary {
  brand_id: string;
  brand_name: string;
  total_cost: number;
  last_cost_date: string;
}
