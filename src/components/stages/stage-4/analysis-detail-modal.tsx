"use client";

import { useState } from "react";
import Image from "next/image";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreSlider } from "@/components/common/score-slider";
import { InlineEditField } from "@/components/common/inline-edit-field";
import { TagChipEditor } from "@/components/common/tag-chip-editor";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { AdLibraryAd, AdAnalysis } from "@/types/ad-library";

interface AnalysisDetailModalProps {
  ad: AdLibraryAd;
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AnalysisDetailModal({
  ad,
  brandId,
  open,
  onOpenChange,
  onUpdate,
}: AnalysisDetailModalProps) {
  const analysis = (ad.analysis || {}) as AdAnalysis;
  const [localAnalysis, setLocalAnalysis] = useState(analysis);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overall_scores"])
  );

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateSection(section: string, value: unknown) {
    setLocalAnalysis((prev) => ({ ...prev, [section]: value }));
  }

  function updateFieldInObject(section: string, field: string, value: unknown) {
    setLocalAnalysis((prev) => ({
      ...prev,
      [section]: {
        ...(prev as unknown as Record<string, Record<string, unknown>>)[section],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await axios.patch(`/api/brands/${brandId}/ads/${ad.id}`, {
        analysis: localAnalysis,
      });
      toast.success("Analysis saved");
      onUpdate();
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReanalyze() {
    try {
      await axios.post(`/api/brands/${brandId}/ads/${ad.id}/reanalyze`);
      toast.success("Re-analysis queued");
      onOpenChange(false);
      onUpdate();
    } catch {
      toast.error("Failed to queue re-analysis");
    }
  }

  const sections = [
    { key: "overall_scores", title: "Overall Scores" },
    { key: "layout_architecture", title: "Layout Architecture" },
    { key: "typography_analysis", title: "Typography" },
    { key: "color_analysis", title: "Color Analysis" },
    { key: "product_presentation", title: "Product Presentation" },
    { key: "human_element", title: "Human Element" },
    { key: "persuasion_mechanics", title: "Persuasion Mechanics" },
  ];

  function renderSectionContent(sectionKey: string, data: unknown) {
    // If data is a string, render as editable text block
    if (typeof data === "string") {
      return (
        <InlineEditField
          value={data}
          onSave={(v) => updateSection(sectionKey, v)}
          multiline
        />
      );
    }

    // If data is an object, render each field
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return (
        <div className="space-y-3">
          {Object.entries(data as Record<string, unknown>).map(([key, value]) => {
            if (typeof value === "number") {
              return (
                <ScoreSlider
                  key={key}
                  label={key.replace(/_/g, " ")}
                  value={value}
                  onChange={(v) => updateFieldInObject(sectionKey, key, v)}
                />
              );
            }
            if (typeof value === "boolean") {
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <Badge variant={value ? "default" : "outline"} className="text-[10px]">
                    {value ? "Yes" : "No"}
                  </Badge>
                </div>
              );
            }
            if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
              return (
                <div key={key} className="space-y-1 py-1">
                  <label className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <TagChipEditor
                    tags={value as string[]}
                    onChange={(v) => updateFieldInObject(sectionKey, key, v)}
                  />
                </div>
              );
            }
            if (typeof value === "string") {
              return (
                <div key={key} className="space-y-1 py-1">
                  <label className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <InlineEditField
                    value={value}
                    onSave={(v) => updateFieldInObject(sectionKey, key, v)}
                    multiline={value.length > 80}
                  />
                </div>
              );
            }
            // Fallback: render as JSON string
            return (
              <div key={key} className="space-y-1 py-1">
                <label className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </label>
                <p className="text-xs text-muted-foreground break-all">
                  {JSON.stringify(value)}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    // Array at top level
    if (Array.isArray(data) && data.every((v) => typeof v === "string")) {
      return (
        <TagChipEditor
          tags={data as string[]}
          onChange={(v) => updateSection(sectionKey, v)}
        />
      );
    }

    return <p className="text-xs text-muted-foreground italic">No data</p>;
  }

  function getSectionSummary(data: unknown): string {
    if (typeof data === "string") return `${data.length} chars`;
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return `${Object.keys(data).length} fields`;
    }
    if (Array.isArray(data)) return `${data.length} items`;
    return "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl p-0 gap-0 max-h-[90vh] flex flex-col">
        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-base">Ad Analysis</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReanalyze}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-analyze
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Image + Meta row */}
          <div className="flex gap-6 mb-6">
            <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={ad.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Archetype
                </label>
                <p className="text-sm font-semibold mt-0.5">
                  {localAnalysis.archetype || "—"}
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Traits
                </label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(localAnalysis.archetype_traits || []).map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                  {(!localAnalysis.archetype_traits || localAnalysis.archetype_traits.length === 0) && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Patterns
                </label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(localAnalysis.patterns || []).map((p, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {p}
                    </Badge>
                  ))}
                  {(!localAnalysis.patterns || localAnalysis.patterns.length === 0) && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              {ad.user_edited && (
                <Badge variant="outline" className="text-yellow-500 text-[10px]">
                  Manually edited
                </Badge>
              )}
            </div>
          </div>

          <Separator className="mb-4" />

          {/* Collapsible analysis sections */}
          <div className="space-y-2">
            {sections.map(({ key, title }) => {
              const data = (localAnalysis as unknown as Record<string, unknown>)[key];
              const isExpanded = expandedSections.has(key);
              const summary = getSectionSummary(data);

              return (
                <div key={key} className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{title}</span>
                    </div>
                    {summary && (
                      <Badge variant="secondary" className="text-[10px]">
                        {summary}
                      </Badge>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border">
                      {renderSectionContent(key, data)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
