"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineEditField } from "@/components/common/inline-edit-field";
import { TagChipEditor } from "@/components/common/tag-chip-editor";
import { ColorSwatchPicker } from "@/components/common/color-swatch-picker";
import { SectionRegenerateModal } from "../section-regenerate-modal";
import { useBrandStore } from "@/stores/brand-store";
import { cn } from "@/lib/utils";
import axios from "axios";
import type { BrandDNA } from "@/types/brand";

interface DNASectionProps {
  sectionKey: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  isWarning?: boolean;
}

export function DNASection({
  sectionKey,
  title,
  description,
  data,
  isWarning,
}: DNASectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showRegen, setShowRegen] = useState(false);
  const { activeBrand, updateBrand } = useBrandStore();

  async function handleFieldEdit(field: string, value: unknown) {
    if (!activeBrand?.brand_dna) return;
    const updatedDNA = {
      ...activeBrand.brand_dna,
      [sectionKey]: {
        ...(activeBrand.brand_dna as unknown as Record<string, Record<string, unknown>>)[sectionKey],
        [field]: value,
      },
    };
    updateBrand(activeBrand.id, { brand_dna: updatedDNA as BrandDNA });
    try {
      await axios.patch(`/api/brands/${activeBrand.id}`, { brand_dna: updatedDNA });
    } catch {
      // Keep local state
    }
  }

  function renderField(key: string, value: unknown) {
    // Array of strings
    if (Array.isArray(value) && (value.length === 0 || typeof value[0] === "string")) {
      // Check if they look like hex colors
      const isColors = value.length > 0 && value.every((v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v));
      if (isColors) {
        return (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <div className="flex flex-wrap gap-2">
              {(value as string[]).map((color, i) => (
                <ColorSwatchPicker
                  key={i}
                  color={color}
                  onChange={(c) => {
                    const updated = [...value];
                    updated[i] = c;
                    handleFieldEdit(key, updated);
                  }}
                />
              ))}
            </div>
          </div>
        );
      }
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground capitalize">
            {key.replace(/_/g, " ")}
          </label>
          <TagChipEditor
            tags={value as string[]}
            onChange={(tags) => handleFieldEdit(key, tags)}
          />
        </div>
      );
    }

    // Nested object
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return (
        <div key={key} className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground capitalize">
            {key.replace(/_/g, " ")}
          </label>
          <div className="pl-3 border-l-2 border-border space-y-2">
            {Object.entries(value).map(([subKey, subVal]) =>
              renderField(`${key}.${subKey}`, subVal)
            )}
          </div>
        </div>
      );
    }

    // String or primitive
    const fieldName = key.includes(".") ? key.split(".").pop()! : key;
    const isLongText = typeof value === "string" && value.length > 100;
    return (
      <div key={key} className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground capitalize">
          {fieldName.replace(/_/g, " ")}
        </label>
        <InlineEditField
          value={String(value || "")}
          onSave={(v) => {
            if (key.includes(".")) {
              const [parentKey, childKey] = key.split(".");
              const parent = (data[parentKey] || {}) as Record<string, unknown>;
              handleFieldEdit(parentKey, { ...parent, [childKey]: v });
            } else {
              handleFieldEdit(key, v);
            }
          }}
          multiline={isLongText}
        />
      </div>
    );
  }

  return (
    <>
      <Card className={cn(isWarning && "border-yellow-500/50")}>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base">{title}</CardTitle>
              {isWarning && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">
                  Guardrails
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowRegen(true);
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground ml-6">{description}</p>
        </CardHeader>
        {isOpen && (
          <CardContent className="space-y-4">
            {Object.entries(data).map(([key, value]) =>
              renderField(key, value)
            )}
            {Object.keys(data).length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No data in this section
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <SectionRegenerateModal
        open={showRegen}
        onOpenChange={setShowRegen}
        sectionKey={sectionKey}
        sectionTitle={title}
      />
    </>
  );
}
