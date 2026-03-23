export type GenerationStatus = "pending" | "generating" | "complete" | "failed";
export type ImageModel = "nano-banana-pro" | "flux-pro";

export interface GeneratedAd {
  id: string;
  brand_id: string;
  org_id: string | null;
  concept_number: number;
  variant_number: number;
  cycle_number: number;
  prompt_text: string;
  model_used: string;
  seed: number | null;
  raw_image_url: string | null;
  compositing_spec: CompositingSpec | null;
  final_image_url: string | null;
  is_selected: boolean;
  qa_result: QAResult | null;
  qa_passed: boolean | null;
  generation_status: GenerationStatus;
  cost_usd: number;
  error_message: string | null;
  created_at: string;
  generated_at: string | null;
  composited_at: string | null;
}

export interface CompositingSpec {
  text_overlays: TextOverlay[];
  logo_overlay: LogoOverlay | null;
  canvas_width: number;
  canvas_height: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  textAlign: string;
  textCase: "none" | "uppercase" | "lowercase" | "capitalize";
  shadow: {
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  background: {
    enabled: boolean;
    color: string;
    opacity: number;
    padding: number;
    borderRadius: number;
  };
}

export interface LogoOverlay {
  image_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface QAResult {
  checks: QACheck[];
  passed: boolean;
  overrides: QAOverride[];
}

export interface QACheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface QAOverride {
  check_name: string;
  justification: string;
  overridden_at: string;
}
