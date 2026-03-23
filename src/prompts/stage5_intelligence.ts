import type { BrandDNA } from "@/types/brand";

export function getIntelligencePrompt(
  brandDNA: BrandDNA,
  analyses: Record<string, unknown>[]
): string {
  return `You are a creative strategist synthesizing ad intelligence data. Analyze the following Brand DNA and ad analyses to produce a strategic creative intelligence report.

## Brand DNA
${JSON.stringify(brandDNA, null, 2)}

## Ad Analyses (${analyses.length} ads analyzed)
${JSON.stringify(analyses.slice(0, 50), null, 2)}

---

Synthesize this data into a strategic intelligence report. Identify patterns, cluster archetypes, find competitive gaps, and recommend 4 concept directions.

Respond with ONLY this JSON structure:

{
  "winning_creative_patterns": [
    {
      "name": "string",
      "description": "string",
      "frequency": 0,
      "examples": ["ad description 1", "ad description 2"],
      "score": 0
    }
  ],
  "creative_archetype_clusters": [
    {
      "name": "string (e.g., Minimal Product Hero)",
      "description": "string",
      "traits": ["trait1", "trait2"],
      "ad_count": 0,
      "avg_score": 0
    }
  ],
  "competitive_creative_intelligence": {
    "gaps": ["gap1", "gap2", "gap3"],
    "opportunities": ["opp1", "opp2"],
    "threats": ["threat1", "threat2"]
  },
  "failure_patterns": [
    {
      "name": "string",
      "description": "string",
      "frequency": 0,
      "examples": [],
      "score": 0
    }
  ],
  "strategic_recommendations": {
    "four_ad_concept_directions": [
      {
        "name": "string",
        "archetype": "string",
        "hook_type": "string",
        "funnel_stage": "string (awareness/consideration/conversion)",
        "rationale": "string (2-3 sentences explaining why this direction)",
        "supporting_patterns": ["pattern1", "pattern2"]
      }
    ],
    "general_recommendations": ["rec1", "rec2", "rec3"]
  }
}`;
}
