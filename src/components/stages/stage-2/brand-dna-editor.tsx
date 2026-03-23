"use client";

import { useBrandStore } from "@/stores/brand-store";
import { DNASection } from "./sections/dna-section";
import type { BrandDNA } from "@/types/brand";

const SECTION_CONFIG = [
  { key: "brand_identity", title: "Brand Identity", description: "Core values, mission, personality" },
  { key: "target_audience", title: "Target Audience", description: "Demographics, psychographics, pain points" },
  { key: "visual_identity", title: "Visual Identity", description: "Colors, typography, imagery style" },
  { key: "messaging_framework", title: "Messaging Framework", description: "Tone, key messages, value propositions" },
  { key: "competitive_positioning", title: "Competitive Positioning", description: "USPs, market position, differentiation" },
  { key: "negative_brand_space", title: "Negative Brand Space", description: "What the brand is NOT", isWarning: true },
  { key: "ad_creative_directives", title: "Ad Creative Directives", description: "Must-include elements, formats, CTA style" },
];

export function BrandDNAEditor() {
  const { activeBrand } = useBrandStore();
  const brandDNA = activeBrand?.brand_dna as BrandDNA | null;

  if (!brandDNA) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No Brand DNA data available
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand DNA</h2>
          <p className="text-sm text-muted-foreground">
            Version {activeBrand?.brand_dna_version || 1} — All fields are editable
          </p>
        </div>
      </div>

      {SECTION_CONFIG.map((config) => (
        <DNASection
          key={config.key}
          sectionKey={config.key}
          title={config.title}
          description={config.description}
          data={(brandDNA as unknown as Record<string, Record<string, unknown>>)[config.key] || {}}
          isWarning={config.isWarning}
        />
      ))}
    </div>
  );
}
