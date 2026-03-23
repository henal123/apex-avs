import type { StoreScrapeData } from "@/types/brand";

export function getBrandDNAPrompt(scrapeData: StoreScrapeData): string {
  const productSample = scrapeData.collections
    .flatMap((c) => c.products)
    .slice(0, 10)
    .map((p) => `- ${p.name}: $${p.price} — ${p.description?.slice(0, 100) || "No description"}`)
    .join("\n");

  const colors = scrapeData.branding.colors.join(", ") || "None detected";
  const fonts = scrapeData.branding.fonts.join(", ") || "None detected";

  return `You are a brand strategist analyzing an e-commerce store. Extract and synthesize a comprehensive Brand DNA from the following store data.

## Store Information
- Store Name: ${scrapeData.store_name}
- URL: ${scrapeData.store_url}
- Platform: ${scrapeData.platform}
- Tagline: ${scrapeData.tagline || "None"}
- Description: ${scrapeData.description || "None"}

## Products (Sample)
${productSample || "No products found"}

## Branding Detected
- Colors: ${colors}
- Fonts: ${fonts}
- Logo: ${scrapeData.branding.logo_url ? "Found" : "Not found"}

## Collections
${scrapeData.collections.map((c) => `- ${c.name} (${c.products.length} products)`).join("\n") || "None"}

---

Generate a comprehensive Brand DNA document with the following JSON structure. Every field must be populated with meaningful, specific content based on the store data above.

{
  "brand_identity": {
    "core_values": ["value1", "value2", "value3"],
    "mission_statement": "string",
    "brand_personality": ["trait1", "trait2", "trait3", "trait4"],
    "brand_story": "string (2-3 sentences)",
    "brand_promise": "string"
  },
  "target_audience": {
    "primary_demographic": "string",
    "age_range": "string",
    "gender_skew": "string",
    "income_level": "string",
    "psychographics": ["trait1", "trait2", "trait3"],
    "pain_points": ["pain1", "pain2", "pain3"],
    "aspirations": ["aspiration1", "aspiration2"],
    "buying_triggers": ["trigger1", "trigger2", "trigger3"]
  },
  "visual_identity": {
    "primary_colors": ["#hex1", "#hex2"],
    "secondary_colors": ["#hex3", "#hex4"],
    "accent_colors": ["#hex5"],
    "color_mood": "string describing the emotional tone of the palette",
    "typography": {
      "heading": "font name or style description",
      "body": "font name or style description",
      "accent": "font name or style description"
    },
    "photography_style": "string describing ideal photo style",
    "imagery_tone": "string (e.g., bright and airy, dark and moody, natural)",
    "visual_motifs": ["motif1", "motif2"]
  },
  "messaging_framework": {
    "tone_of_voice": "string (e.g., friendly and approachable, premium and sophisticated)",
    "key_messages": ["message1", "message2", "message3"],
    "value_propositions": ["prop1", "prop2", "prop3"],
    "communication_pillars": ["pillar1", "pillar2", "pillar3"],
    "tagline_suggestions": ["tagline1", "tagline2"]
  },
  "competitive_positioning": {
    "market_position": "string",
    "unique_selling_points": ["usp1", "usp2", "usp3"],
    "price_positioning": "string (budget/mid-range/premium/luxury)",
    "differentiation_factors": ["factor1", "factor2"],
    "category_context": "string describing the competitive landscape"
  },
  "negative_brand_space": {
    "visual_donts": ["dont1", "dont2", "dont3"],
    "messaging_donts": ["dont1", "dont2", "dont3"],
    "tone_donts": ["dont1", "dont2", "dont3"],
    "audience_exclusions": ["exclusion1", "exclusion2"],
    "competitive_avoidance": ["avoid1", "avoid2"]
  },
  "ad_creative_directives": {
    "must_include_elements": ["element1", "element2"],
    "preferred_ad_formats": ["format1", "format2"],
    "cta_style": "string describing ideal CTA approach",
    "hero_product_categories": ["category1", "category2"],
    "seasonal_considerations": "string",
    "social_proof_approach": "string"
  }
}

Respond with ONLY the JSON object. No markdown, no explanations.`;
}

export function getSectionRegeneratePrompt(
  sectionName: string,
  currentDNA: Record<string, unknown>,
  additionalContext: string
): string {
  return `You are a brand strategist. Regenerate ONLY the "${sectionName}" section of a Brand DNA document.

## Current Brand DNA
${JSON.stringify(currentDNA, null, 2)}

## Additional Context from the User
${additionalContext || "No additional context provided."}

Regenerate the "${sectionName}" section with improved, more specific content. Keep the same JSON structure as the current section but make the content better based on the additional context.

Respond with ONLY the JSON object for this single section. No markdown, no explanations.`;
}
