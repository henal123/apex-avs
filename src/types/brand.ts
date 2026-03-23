export type BrandCategory =
  | "fashion"
  | "beauty"
  | "health"
  | "electronics"
  | "home"
  | "food"
  | "sports"
  | "toys"
  | "automotive"
  | "jewelry"
  | "pets"
  | "ecommerce"
  | "other";

export type PipelineStatus =
  | "stage_1"
  | "stage_2"
  | "stage_3"
  | "stage_4"
  | "stage_5"
  | "stage_6"
  | "stage_7"
  | "stage_8"
  | "stage_9"
  | "complete";

export type StageStatus =
  | "not_started"
  | "processing"
  | "review"
  | "approved"
  | "failed"
  | "invalidated";

export interface Brand {
  id: string;
  org_id: string | null;
  owner_id: string;
  brand_name: string;
  slug: string;
  store_url: string;
  category: BrandCategory;
  store_scrape_data: StoreScrapeData | null;
  brand_dna: BrandDNA | null;
  brand_dna_version: number;
  creative_intelligence_report: IntelligenceReport | null;
  ad_concepts: AdConcept[] | null;
  pipeline_status: PipelineStatus;
  current_stage_status: StageStatus;
  notes: string;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  // Computed fields
  ad_count?: number;
  active_job?: PipelineJobSummary | null;
}

export interface PipelineJobSummary {
  id: string;
  stage: number;
  status: string;
  progress: JobProgress;
}

export interface StoreScrapeData {
  store_name: string;
  store_url: string;
  platform: string;
  tagline: string;
  description: string;
  collections: Collection[];
  branding: BrandingData;
  metadata: Record<string, unknown>;
}

export interface Collection {
  name: string;
  slug: string;
  products: Product[];
}

export interface Product {
  name: string;
  slug: string;
  price: string;
  description: string;
  images: string[];
  variants: string[];
}

export interface BrandingData {
  logo_url: string | null;
  favicon_url: string | null;
  colors: string[];
  fonts: string[];
}

export interface BrandDNA {
  brand_identity: DNASection;
  target_audience: DNASection;
  visual_identity: VisualIdentitySection;
  messaging_framework: DNASection;
  competitive_positioning: DNASection;
  negative_brand_space: DNASection;
  ad_creative_directives: DNASection;
}

export interface DNASection {
  [key: string]: string | string[] | Record<string, unknown>;
}

export interface VisualIdentitySection extends DNASection {
  primary_colors: string[];
  secondary_colors: string[];
  accent_colors: string[];
  typography: {
    heading: string;
    body: string;
    accent: string;
  };
}

export interface IntelligenceReport {
  winning_creative_patterns: Pattern[];
  creative_archetype_clusters: ArchetypeCluster[];
  competitive_creative_intelligence: CompetitiveIntel;
  failure_patterns: Pattern[];
  strategic_recommendations: {
    four_ad_concept_directions: ConceptDirection[];
    [key: string]: unknown;
  };
}

export interface Pattern {
  name: string;
  description: string;
  frequency: number;
  examples: string[];
  score: number;
}

export interface ArchetypeCluster {
  name: string;
  description: string;
  traits: string[];
  ad_count: number;
  avg_score: number;
}

export interface CompetitiveIntel {
  gaps: string[];
  opportunities: string[];
  threats: string[];
}

export interface ConceptDirection {
  name: string;
  archetype: string;
  hook_type: string;
  funnel_stage: string;
  rationale: string;
  supporting_patterns: string[];
}

export interface AdConcept {
  concept_number: number;
  strategic_brief: Record<string, unknown>;
  image_generation_prompt: string;
  prompt_structure: Record<string, unknown>;
  text_overlays: TextOverlaySpec[];
  brand_elements: Record<string, unknown>;
  technical_specifications: Record<string, unknown>;
  quality_checklist: string[];
}

export interface TextOverlaySpec {
  type: string;
  text: string;
  position: { x: number; y: number };
  style: Record<string, unknown>;
}

export interface JobProgress {
  items_total: number;
  items_processed: number;
  items_failed: number;
  current_item: string | null;
  percent: number;
}
