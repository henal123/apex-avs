import type { BrandDNA, ConceptDirection } from "@/types/brand";

export function getConceptGenerationPrompt(
  brandDNA: BrandDNA,
  conceptDirection: ConceptDirection,
  conceptNumber: number,
  productImages: string[]
): string {
  return `You are an expert ad creative director. Create a detailed ad concept specification for image generation.

## Brand DNA
${JSON.stringify(brandDNA, null, 2)}

## Concept Direction #${conceptNumber}
- Name: ${conceptDirection.name}
- Archetype: ${conceptDirection.archetype}
- Hook Type: ${conceptDirection.hook_type}
- Funnel Stage: ${conceptDirection.funnel_stage}
- Rationale: ${conceptDirection.rationale}
- Supporting Patterns: ${conceptDirection.supporting_patterns.join(", ")}

## Available Product Images
${productImages.length} product images available for reference.

---

Generate a complete ad concept specification. Respond with ONLY this JSON:

{
  "strategic_brief": {
    "concept_name": "${conceptDirection.name}",
    "objective": "string",
    "target_emotion": "string",
    "key_message": "string",
    "cta": "string"
  },
  "image_generation_prompt": "string (50-100 word detailed prompt for AI image generation including style, composition, mood, lighting, color palette, product placement)",
  "prompt_structure": {
    "style": "string",
    "composition": "string",
    "mood": "string",
    "lighting": "string",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "product_placement": "string",
    "background": "string"
  },
  "text_overlays": [
    {
      "type": "headline",
      "text": "string",
      "position": {"x": 0.5, "y": 0.15},
      "style": {
        "fontSize": 48,
        "fontWeight": "bold",
        "color": "#ffffff",
        "textCase": "uppercase"
      }
    },
    {
      "type": "subheadline",
      "text": "string",
      "position": {"x": 0.5, "y": 0.75},
      "style": {
        "fontSize": 24,
        "fontWeight": "normal",
        "color": "#ffffff",
        "textCase": "none"
      }
    },
    {
      "type": "cta",
      "text": "string",
      "position": {"x": 0.5, "y": 0.88},
      "style": {
        "fontSize": 20,
        "fontWeight": "bold",
        "color": "#ffffff",
        "textCase": "uppercase"
      }
    }
  ],
  "brand_elements": {
    "logo_position": "string (top-left, top-right, bottom-left, bottom-right, center)",
    "logo_size": "string (small, medium, large)",
    "brand_colors_usage": "string"
  },
  "technical_specifications": {
    "resolution": "1080x1080",
    "aspect_ratio": "1:1",
    "format": "static",
    "guidance_scale": 7.5,
    "steps": 30
  },
  "quality_checklist": [
    "Product clearly visible",
    "Brand colors present",
    "Text readable at mobile size",
    "Clear visual hierarchy",
    "Emotional resonance with target audience"
  ]
}`;
}
