"use client";

import { useBrandStore } from "@/stores/brand-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CollectionsAccordion } from "./collections-accordion";
import { MetadataEditor } from "./metadata-editor";
import { ColorPaletteEditor } from "./color-palette-editor";
import { TypographyPanel } from "./typography-panel";
import type { StoreScrapeData } from "@/types/brand";

export function ScrapeResults() {
  const { activeBrand } = useBrandStore();
  const scrapeData = activeBrand?.store_scrape_data as StoreScrapeData | null;

  if (!scrapeData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scrape data available
      </div>
    );
  }

  const totalProducts = scrapeData.collections.reduce(
    (sum, c) => sum + c.products.length,
    0
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">{scrapeData.platform}</Badge>
        <Badge variant="secondary">
          {scrapeData.collections.length} collections
        </Badge>
        <Badge variant="secondary">{totalProducts} products</Badge>
        <Badge variant="secondary">
          {scrapeData.branding.colors.length} colors
        </Badge>
        <Badge variant="secondary">
          {scrapeData.branding.fonts.length} fonts
        </Badge>
      </div>

      {/* Metadata */}
      <MetadataEditor scrapeData={scrapeData} />

      <Separator />

      {/* Branding row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ColorPaletteEditor colors={scrapeData.branding.colors} />
        <TypographyPanel fonts={scrapeData.branding.fonts} />
      </div>

      <Separator />

      {/* Collections & Products */}
      <CollectionsAccordion collections={scrapeData.collections} />
    </div>
  );
}
