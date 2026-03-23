"use client";

import { Store, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditField } from "@/components/common/inline-edit-field";
import { useBrandStore } from "@/stores/brand-store";
import axios from "axios";
import type { StoreScrapeData } from "@/types/brand";

interface MetadataEditorProps {
  scrapeData: StoreScrapeData;
}

export function MetadataEditor({ scrapeData }: MetadataEditorProps) {
  const { activeBrand, updateBrand } = useBrandStore();

  async function handleEdit(field: string, value: string) {
    if (!activeBrand) return;
    const updated = {
      ...activeBrand.store_scrape_data,
      [field]: value,
    };
    try {
      await axios.patch(`/api/brands/${activeBrand.id}`, {
        store_scrape_data: updated,
      });
      updateBrand(activeBrand.id, { store_scrape_data: updated as StoreScrapeData });
    } catch {
      // Silent fail - data is still in local state
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Store Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Store Name
          </label>
          <InlineEditField
            value={scrapeData.store_name}
            onSave={(v) => handleEdit("store_name", v)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Tagline
          </label>
          <InlineEditField
            value={scrapeData.tagline}
            onSave={(v) => handleEdit("tagline", v)}
            placeholder="No tagline detected"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <InlineEditField
            value={scrapeData.description}
            onSave={(v) => handleEdit("description", v)}
            multiline
            placeholder="No description detected"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          {scrapeData.store_url}
        </div>
      </CardContent>
    </Card>
  );
}
