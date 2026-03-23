import type { BrandDNA } from "@/types/brand";

export function getAdAnalysisPrompt(brandDNA: BrandDNA | null): string {
  const dnaContext = brandDNA
    ? `\n## Brand DNA Context\n${JSON.stringify(brandDNA, null, 2)}\n`
    : "";

  return `You are an expert ad creative analyst. Analyze this ad image in detail.
${dnaContext}
Score the following dimensions from 1-10 and classify the ad. Respond with ONLY a JSON object.

{
  "layout_architecture": {
    "layout_type": "string (e.g., single product hero, split screen, collage, minimal, text-heavy)",
    "visual_hierarchy_score": 0,
    "white_space_usage": 0,
    "composition_balance": 0,
    "grid_alignment": "string"
  },
  "typography_analysis": {
    "headline_presence": true,
    "text_overlay_amount": "string (none, minimal, moderate, heavy)",
    "font_style": "string",
    "text_readability_score": 0,
    "text_hierarchy": 0
  },
  "color_analysis": {
    "dominant_colors": ["#hex1", "#hex2"],
    "color_harmony_score": 0,
    "contrast_score": 0,
    "mood_from_color": "string",
    "brand_color_alignment": 0
  },
  "product_presentation": {
    "product_visibility_score": 0,
    "product_context": "string (studio, lifestyle, in-use, flat-lay)",
    "product_count": 0,
    "packaging_visible": true,
    "scale_representation": "string"
  },
  "human_element": {
    "people_present": true,
    "demographic_representation": "string",
    "emotion_conveyed": "string",
    "model_usage": "string (none, hand-only, partial, full)",
    "relatability_score": 0
  },
  "persuasion_mechanics": {
    "hook_type": "string (question, statistic, bold claim, emotional, curiosity, social proof)",
    "hook_strength_score": 0,
    "offer_present": true,
    "offer_type": "string (discount, bundle, free shipping, none)",
    "urgency_level": 0,
    "social_proof_type": "string (reviews, UGC, endorsement, statistics, none)",
    "cta_strength_score": 0,
    "cta_text": "string"
  },
  "overall_scores": {
    "creative_quality": 0,
    "brand_consistency": 0,
    "scroll_stopping_power": 0,
    "conversion_potential": 0,
    "platform_optimization": 0
  },
  "archetype": "string (e.g., Minimal Product Hero, Social Proof Stack, Lifestyle Aspirational, UGC Testimonial, Bold Offer, Educational, Before-After)",
  "archetype_traits": ["trait1", "trait2", "trait3"],
  "patterns": ["pattern1", "pattern2"],
  "competitive_gaps": ["gap1", "gap2"]
}

Respond with ONLY the JSON object.`;
}
