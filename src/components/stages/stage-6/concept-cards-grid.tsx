"use client";

import { useState } from "react";
import { useBrandStore } from "@/stores/brand-store";
import { useGenerationStore } from "@/stores/generation-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Palette } from "lucide-react";
import type { AdConcept } from "@/types/brand";
import type { ImageModel } from "@/types/generation";
import axios from "axios";
import { toast } from "sonner";

export function ConceptCardsGrid() {
  const { activeBrand, updateBrand } = useBrandStore();
  const { globalModel, setGlobalModel, getModelForConcept, setConceptModel } =
    useGenerationStore();
  const concepts = (activeBrand?.ad_concepts || []) as AdConcept[];

  async function handlePromptEdit(index: number, prompt: string) {
    if (!activeBrand) return;
    const updated = [...concepts];
    updated[index] = { ...updated[index], image_generation_prompt: prompt };
    updateBrand(activeBrand.id, { ad_concepts: updated });
    try {
      await axios.patch(`/api/brands/${activeBrand.id}`, { ad_concepts: updated });
    } catch {}
  }

  if (concepts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No concepts generated yet
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ad Concepts</h2>
          <p className="text-sm text-muted-foreground">
            {concepts.length} concepts with image generation prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Global Model:</Label>
          <Select
            value={globalModel}
            onValueChange={(v) => v && setGlobalModel(v as ImageModel)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nano-banana-pro">Nano Banana Pro (Fast)</SelectItem>
              <SelectItem value="flux-pro">Flux Pro (Premium)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {concepts.map((concept, i) => (
          <ConceptCard
            key={i}
            concept={concept}
            index={i}
            model={getModelForConcept(i + 1)}
            onModelChange={(m) => setConceptModel(i + 1, m)}
            onPromptEdit={(prompt) => handlePromptEdit(i, prompt)}
          />
        ))}
      </div>
    </div>
  );
}

function ConceptCard({
  concept,
  index,
  model,
  onModelChange,
  onPromptEdit,
}: {
  concept: AdConcept;
  index: number;
  model: ImageModel;
  onModelChange: (m: ImageModel) => void;
  onPromptEdit: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [promptText, setPromptText] = useState(concept.image_generation_prompt || "");
  const brief = concept.strategic_brief as Record<string, string> | undefined;
  const product = (concept as unknown as Record<string, unknown>).product as Record<string, string> | undefined;
  const refAdUrl = (concept as unknown as Record<string, unknown>).reference_ad_url as string | undefined;
  const adLayout = (concept as unknown as Record<string, unknown>).ad_layout as Record<string, string> | undefined;
  const brandElements = (concept as unknown as Record<string, unknown>).brand_elements as Record<string, string> | undefined;
  const conceptName = (concept as unknown as Record<string, unknown>).concept_name as string | undefined;
  const structure = concept.prompt_structure as Record<string, unknown> | undefined;
  const rawColors = structure?.color_palette || (brandElements ? [brandElements.primary_color, brandElements.accent_color].filter(Boolean) : []);
  const colors = Array.isArray(rawColors) ? rawColors : [];

  return (
    <Card className="border-2">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge>Concept {index + 1}</Badge>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <CardTitle className="text-base">
              {conceptName || brief?.concept_name || `Concept ${index + 1}`}
            </CardTitle>
          </div>
          {colors.length > 0 && (
            <div className="flex gap-0.5">
              {(Array.isArray(colors) ? colors : []).slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: String(c) }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {product?.name && (
            <Badge variant="secondary" className="text-[10px]">Product: {product.name}</Badge>
          )}
          {product?.price && (
            <Badge variant="outline" className="text-[10px]">${product.price}</Badge>
          )}
          {brief?.target_emotion && (
            <Badge variant="outline" className="text-[10px]">{brief.target_emotion}</Badge>
          )}
          {brief?.funnel_stage && (
            <Badge variant="outline" className="text-[10px]">{brief.funnel_stage}</Badge>
          )}
          {refAdUrl && (
            <Badge variant="outline" className="text-[10px] text-blue-500">Has Reference Ad</Badge>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Product & Reference */}
          {(product || refAdUrl) && (
            <div className="flex gap-3 items-start">
              {refAdUrl && (
                <div className="space-y-1">
                  <Label className="text-[10px]">Reference Ad</Label>
                  <img src={refAdUrl} alt="Reference" className="h-16 w-16 rounded object-cover border border-border" />
                </div>
              )}
              {product && (
                <div className="space-y-1 flex-1">
                  <Label className="text-[10px]">Featured Product</Label>
                  <p className="text-sm font-medium">{product.name}</p>
                  {product.price && <p className="text-xs text-muted-foreground">${product.price}</p>}
                </div>
              )}
            </div>
          )}

          {/* Brief */}
          {brief && (
            <div className="space-y-2">
              {brief.objective && <><Label className="text-xs">Objective</Label><p className="text-sm text-muted-foreground">{brief.objective}</p></>}
              {brief.key_message && <><Label className="text-xs">Key Message</Label><p className="text-sm text-muted-foreground">{brief.key_message}</p></>}
              {brief.hook_type && <><Label className="text-xs">Hook</Label><p className="text-sm text-muted-foreground">{brief.hook_type}</p></>}
            </div>
          )}

          {/* Ad Layout */}
          {adLayout && (
            <div className="space-y-1">
              <Label className="text-xs">Ad Layout</Label>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {Object.entries(adLayout).map(([k, v]) => (
                  <p key={k}><span className="capitalize">{k.replace(/_/g, " ")}:</span> {v}</p>
                ))}
              </div>
            </div>
          )}

          {/* Prompt editor */}
          <div className="space-y-2">
            <Label className="text-xs">Image Generation Prompt</Label>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onBlur={() => {
                if (promptText !== concept.image_generation_prompt) {
                  onPromptEdit(promptText);
                }
              }}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {/* Text overlays preview */}
          {concept.text_overlays && concept.text_overlays.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Text Overlays</Label>
              <div className="space-y-1">
                {concept.text_overlays.map((overlay, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">{overlay.type}</Badge>
                    <span className="text-muted-foreground">{overlay.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Model:</Label>
            <Select
              value={model}
              onValueChange={(v) => v && onModelChange(v as ImageModel)}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                <SelectItem value="flux-pro">Flux Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
