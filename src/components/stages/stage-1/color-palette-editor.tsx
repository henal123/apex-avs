"use client";

import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorSwatchPicker } from "@/components/common/color-swatch-picker";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand-store";
import { useState } from "react";
import axios from "axios";
import type { StoreScrapeData } from "@/types/brand";

interface ColorPaletteEditorProps {
  colors: string[];
}

export function ColorPaletteEditor({ colors: initialColors }: ColorPaletteEditorProps) {
  const { activeBrand, updateBrand } = useBrandStore();
  const [colors, setColors] = useState(initialColors);

  async function saveColors(updated: string[]) {
    if (!activeBrand?.store_scrape_data) return;
    const newData = {
      ...activeBrand.store_scrape_data,
      branding: {
        ...activeBrand.store_scrape_data.branding,
        colors: updated,
      },
    };
    setColors(updated);
    try {
      await axios.patch(`/api/brands/${activeBrand.id}`, {
        store_scrape_data: newData,
      });
      updateBrand(activeBrand.id, { store_scrape_data: newData as StoreScrapeData });
    } catch {
      // keep local state
    }
  }

  function handleColorChange(index: number, color: string) {
    const updated = [...colors];
    updated[index] = color;
    saveColors(updated);
  }

  function handleAddColor() {
    saveColors([...colors, "#6366f1"]);
  }

  function handleRemoveColor(index: number) {
    saveColors(colors.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          Color Palette
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {colors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No colors detected from the store
          </p>
        ) : (
          <div className="space-y-2">
            {colors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorSwatchPicker
                  color={color}
                  onChange={(c) => handleColorChange(i, c)}
                />
                <button
                  onClick={() => handleRemoveColor(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleAddColor}>
          Add Color
        </Button>
      </CardContent>
    </Card>
  );
}
