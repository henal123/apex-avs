import type { JobProgress } from "./brand";

export type JobStatus = "queued" | "processing" | "complete" | "failed" | "cancelled";
export type ApprovalAction = "approved" | "rejected" | "revision_requested" | "unlocked";

export interface PipelineJob {
  id: string;
  brand_id: string;
  org_id: string | null;
  stage: number;
  status: JobStatus;
  progress: JobProgress;
  config: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StageApproval {
  id: string;
  brand_id: string;
  org_id: string | null;
  stage: number;
  action: ApprovalAction;
  feedback: string;
  approved_by: string;
  created_at: string;
}

export const STAGE_NAMES: Record<number, string> = {
  1: "Store Scraping",
  2: "Brand DNA",
  3: "Ad Library",
  4: "AI Analysis",
  5: "Intelligence",
  6: "Concepts",
  7: "Image Generation",
  8: "Bulk Generation",
  9: "Export",
};
