export type SourceType = "brand_own" | "competitor" | "adjacent_category";
export type PerformanceTier = "winner" | "performer" | "testing" | "unknown";
export type AdFlag = "reference" | "ignore" | null;
export type AnalysisStatus = "pending" | "processing" | "complete" | "failed";

export interface AdLibraryAd {
  id: string;
  brand_id: string;
  org_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  source_type: SourceType;
  source_name: string;
  performance_tier: PerformanceTier;
  flag: AdFlag;
  ad_copy: AdCopy;
  days_running: number | null;
  is_active: boolean | null;
  user_tags: string[];
  analysis: AdAnalysis | null;
  analysis_status: AnalysisStatus;
  user_edited: boolean;
  edit_history: EditHistoryEntry[];
  metadata: Record<string, unknown>;
  uploaded_at: string;
  analyzed_at: string | null;
  created_at: string;
}

export interface AdCopy {
  primary_text?: string;
  headline?: string;
  description?: string;
  cta?: string;
}

export interface AdAnalysis {
  layout_architecture: Record<string, number | string>;
  typography_analysis: Record<string, number | string>;
  color_analysis: Record<string, number | string>;
  product_presentation: Record<string, number | string>;
  human_element: Record<string, number | string>;
  persuasion_mechanics: Record<string, number | string>;
  overall_scores: Record<string, number>;
  archetype: string;
  archetype_traits: string[];
  patterns: string[];
  competitive_gaps: string[];
}

export interface EditHistoryEntry {
  field: string;
  old_value: unknown;
  new_value: unknown;
  edited_at: string;
}
