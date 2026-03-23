"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Layers, Loader2, Settings2, ImageIcon, RefreshCw, Check,
  ChevronDown, ChevronRight, X, Download, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { ModelSelector, type AIModel } from "@/components/common/model-selector";
import { ReferenceAdPicker } from "./reference-ad-picker";
import { ApprovalBar } from "@/components/common/approval-bar";
import { ProgressTracker } from "@/components/common/progress-tracker";
import { toast } from "sonner";

interface BulkConcept {
  concept_number?: number;
  concept_name?: string;
  product?: { name?: string; price?: string; image_url?: string; images?: string[]; description?: string };
  reference_ad_url?: string;
  reference_ad_analysis_summary?: string;
  hook_type?: string;
  strategic_brief?: Record<string, string>;
  ad_layout?: Record<string, string>;
  text_overlays?: Array<{ type: string; text: string; position: string; style: string }>;
  brand_elements?: Record<string, string>;
  image_generation_prompt?: string;
  image_url?: string | null;
  image_status?: string;
}

export function BulkGenerationContainer() {
  const { activeBrand } = useBrandStore();
  const { stages, setStageState, setCurrentStage } = usePipelineStore();
  const stage = stages[8];

  // State
  const [step, setStep] = useState<"config" | "generating" | "review" | "images">(
    stage?.status === "review" ? "review" : "config"
  );
  const [conceptCount, setConceptCount] = useState(20);
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());
  const [model, setModel] = useState<AIModel>("gemini-2.5-pro");
  const [isGenerating, setIsGenerating] = useState(false);
  const [concepts, setConcepts] = useState<BulkConcept[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [generatingImageIdx, setGeneratingImageIdx] = useState<number | null>(null);
  const [regeneratingPromptIdx, setRegeneratingPromptIdx] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [refPickerIdx, setRefPickerIdx] = useState<number | null>(null);
  const [addMoreCount, setAddMoreCount] = useState(20);
  const [lightboxIdx, setLightboxIdx] = useState<number>(0);

  const brandId = activeBrand?.id;

  // Load concepts from DB on mount — persists across reloads
  const { data: dbConcepts, refetch: refetchConcepts } = useQuery({
    queryKey: ["bulk-concepts-db", brandId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/brands/${brandId}/bulk-concepts`);
      return (data.data || []) as BulkConcept[];
    },
    enabled: !!brandId,
    refetchInterval: step === "generating" ? 3000 : false,
  });

  // Initialize concepts from DB on first load only
  const initialized = useRef(false);
  useEffect(() => {
    if (dbConcepts && dbConcepts.length > 0 && !initialized.current) {
      initialized.current = true;
      setConcepts(dbConcepts);
      setStep("review");
    }
  }, [dbConcepts]);

  // When DB has MORE concepts than local (from "Add More"), append only the new ones
  useEffect(() => {
    if (dbConcepts && dbConcepts.length > concepts.length && initialized.current) {
      // Keep local edits for existing concepts, only add new ones from DB
      const newConcepts = dbConcepts.slice(concepts.length);
      setConcepts((prev) => [...prev, ...newConcepts]);
      if (step === "generating" || step === "config") setStep("review");
    }
  }, [dbConcepts?.length]);

  // Step 1: Generate concept specs (text only) — fire and forget, UI polls
  async function handleGenerateConcepts() {
    if (!brandId) return;
    setIsGenerating(true);
    setStep("generating");
    setConcepts([]);
    setSelectedForExport(new Set());
    initialized.current = false; // Allow re-init from DB

    // Clear existing concepts first
    await axios.patch(`/api/brands/${brandId}`, { ad_concepts: [] }).catch(() => {});

    // Fire and forget — UI polls DB for progressive results
    axios.post(`/api/brands/${brandId}/bulk-concepts`, {
      concept_count: conceptCount,
      model,
    }, { timeout: 600000 })
      .then((resp) => {
        setConcepts(resp.data.data.concepts || []);
        setStep("review");
        toast.success(`${resp.data.data.total} concepts generated!`);
      })
      .catch((err) => {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
        toast.error(msg);
        // Don't go back to config — keep showing whatever concepts were generated
        if (concepts.length > 0) {
          setStep("review");
        } else {
          setStep("config");
        }
      })
      .finally(() => setIsGenerating(false));
  }

  // Generate MORE concepts and APPEND to existing list
  async function handleGenerateMore() {
    if (!brandId || isGenerating) return;
    setIsGenerating(true);

    axios.post(`/api/brands/${brandId}/bulk-concepts`, {
      concept_count: addMoreCount,
      model,
      append: true, // signal to append, not replace
    }, { timeout: 600000 })
      .then((resp) => {
        // The API already saves to DB. Refresh from DB.
        refetchConcepts();
        toast.success(`${resp.data.data.total} more concepts added!`);
      })
      .catch(() => {
        toast.error("Failed to generate more concepts");
        refetchConcepts(); // Still refresh — some may have saved
      })
      .finally(() => setIsGenerating(false));
  }

  // Regenerate prompt by analyzing the reference ad
  async function handleRegeneratePrompt(index: number) {
    if (!brandId) return;
    const concept = concepts[index];
    if (!concept.reference_ad_url) {
      toast.error("Pick a reference ad first");
      return;
    }
    setRegeneratingPromptIdx(index);

    try {
      const { data } = await axios.post(
        `/api/brands/${brandId}/bulk-concepts/regenerate-prompt`,
        { concept_index: index, concept },
        { timeout: 60000 }
      );

      const updated = [...concepts];
      updated[index] = {
        ...updated[index],
        image_generation_prompt: data.data.prompt,
        reference_ad_analysis_summary: data.data.analysis_summary || updated[index].reference_ad_analysis_summary,
      };
      setConcepts(updated);

      // Save to DB
      await axios.patch(`/api/brands/${brandId}`, { ad_concepts: updated }).catch(() => {});
      toast.success("Prompt regenerated from reference ad!");
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
      toast.error(msg);
    } finally {
      setRegeneratingPromptIdx(null);
    }
  }

  // Selection for export
  function toggleSelectForExport(index: number) {
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAllWithImages() {
    const indices = new Set<number>();
    concepts.forEach((c, i) => { if (c.image_url) indices.add(i); });
    setSelectedForExport(indices);
  }

  function clearSelection() {
    setSelectedForExport(new Set());
  }

  async function handleClearAll() {
    if (!brandId) return;
    if (!confirm("Remove all concepts? This cannot be undone.")) return;
    setConcepts([]);
    setSelectedForExport(new Set());
    await axios.patch(`/api/brands/${brandId}`, { ad_concepts: [] }).catch(() => {});
    refetchConcepts();
    setStep("config");
    toast.success("All concepts cleared");
  }

  async function handleExportSelected() {
    if (!activeBrand) return;
    if (selectedForExport.size === 0) {
      toast.error("Select at least one image to export");
      return;
    }
    // Save selected concepts to the export stage
    setStageState(8, { status: "approved" });
    setStageState(9, { status: "not_started" });
    setCurrentStage(9);
    toast.success(`${selectedForExport.size} ads ready for export`);
  }

  // Generate single image for one concept
  async function handleGenerateImage(index: number) {
    if (!brandId) return;
    setGeneratingImageIdx(index);

    try {
      // Force save latest concepts to DB before generating (ensures reference ad is saved)
      await axios.patch(`/api/brands/${brandId}`, { ad_concepts: concepts });

      const { data } = await axios.post(
        `/api/brands/${brandId}/bulk-concepts/generate-image`,
        { concept_index: index, concept: concepts[index] },
        { timeout: 120000 }
      );

      // Update local state immediately
      const updated = [...concepts];
      updated[index] = {
        ...updated[index],
        image_url: data.data.image_url,
        image_status: "generated",
      };
      setConcepts(updated);
      // Also refresh from DB to ensure persistence
      refetchConcepts();
      toast.success(`Image generated for concept ${index + 1}`);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message || "Failed" : "Failed";
      toast.error(msg);
    } finally {
      setGeneratingImageIdx(null);
    }
  }

  // Update a concept field — saves to local state + debounced DB save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function updateConcept(index: number, field: string, value: unknown) {
    const updated = [...concepts];
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      updated[index] = {
        ...updated[index],
        [parent]: { ...((updated[index] as Record<string, unknown>)[parent] as Record<string, unknown> || {}), [child]: value },
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setConcepts(updated);

    // Debounce save to DB (1s after last edit)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (brandId) {
        axios.patch(`/api/brands/${brandId}`, { ad_concepts: updated }).catch(() => {});
      }
    }, 1000);
  }



  // Lightbox
  const conceptsWithImages = concepts.filter((c) => c.image_url);
  function openLightbox(url: string) {
    setLightboxUrl(url);
    setLightboxIdx(conceptsWithImages.findIndex((c) => c.image_url === url));
  }
  function navigateLightbox(dir: number) {
    const next = lightboxIdx + dir;
    if (next >= 0 && next < conceptsWithImages.length) {
      setLightboxIdx(next);
      setLightboxUrl(conceptsWithImages[next].image_url!);
    }
  }

  if (!activeBrand) return null;

  // CONFIG step
  if (step === "config") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Layers className="h-20 w-20 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Bulk Ad Generation</h2>
        <p className="text-sm text-muted-foreground text-center max-w-lg">
          Step 1: Generate concept specs (fast, text-only). Step 2: Review, edit, and generate images for the ones you like.
        </p>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Concepts</Label>
              <Input
                type="number"
                value={conceptCount}
                onChange={(e) => setConceptCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
              />
            </div>
            <ModelSelector value={model} onChange={setModel} label="AI Model:" allowedModels={["gemini-2.5-pro", "gemini-2.5-flash"]} />
          </CardContent>
        </Card>
        <Button onClick={handleGenerateConcepts} disabled={isGenerating} size="lg">
          {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : `Generate ${conceptCount} Concept Specs`}
        </Button>
      </div>
    );
  }

  // GENERATING step — show progress + concepts as they arrive
  if (step === "generating" && concepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <h2 className="text-xl font-semibold">Generating Concept Specs...</h2>
        <p className="text-sm text-muted-foreground">Creating {conceptCount} ad concepts (text only, no images yet)</p>
        <p className="text-xs text-muted-foreground">Concepts will appear below as they&apos;re generated...</p>
      </div>
    );
  }

  // REVIEW step — show all concept cards, editable, with generate-image button per card
  return (
    <div className="space-y-6 pb-20">
      {/* Progress banner during generation */}
      {isGenerating && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Generating concepts... {concepts.length}/{conceptCount}</p>
            <p className="text-xs text-muted-foreground">Concepts appear below as they&apos;re ready. You can already edit and generate images for the ones shown.</p>
          </div>
          <ProgressTracker
            total={conceptCount}
            processed={concepts.length}
            label=""
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bulk Concepts ({concepts.length}{isGenerating ? `/${conceptCount}` : ""})</h2>
          <p className="text-sm text-muted-foreground">
            {isGenerating ? "Concepts appearing live — click any to edit or generate an image" : "Review and edit concepts. Click \"Generate Image\" on any concept to test it."}
            {conceptsWithImages.length > 0 && ` • ${conceptsWithImages.length} images generated`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={addMoreCount}
              onChange={(e) => setAddMoreCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
              className="h-8 w-16 text-xs"
              min={1}
              max={200}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateMore}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : "+ Add More"}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {conceptsWithImages.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary">{concepts.length} concepts</Badge>
            <Badge variant="outline" className="text-green-500">{conceptsWithImages.length} images</Badge>
            {selectedForExport.size > 0 && (
              <Badge className="bg-primary">{selectedForExport.size} selected</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllWithImages}>
              Select All Images
            </Button>
            {selectedForExport.size > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Button size="sm" onClick={handleExportSelected}>
                  <Download className="h-3 w-3 mr-1" />
                  Export {selectedForExport.size} Selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Concept cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {concepts.map((concept, idx) => {
          const isExpanded = expandedCard === idx;
          const isGeneratingThis = generatingImageIdx === idx;

          return (
            <Card key={idx} className="overflow-hidden rounded-xl shadow-sm">
              {/* Image preview or generate button */}
              {concept.image_url ? (
                <div
                  className="relative aspect-square cursor-pointer group"
                  onClick={() => openLightbox(concept.image_url!)}
                >
                  <Image
                    src={concept.image_url}
                    alt={concept.concept_name || `Concept ${idx + 1}`}
                    fill
                    className={`object-cover group-hover:scale-105 transition-transform ${selectedForExport.has(idx) ? "ring-4 ring-primary ring-inset" : ""}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {/* Select for export checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectForExport(idx); }}
                    className={`absolute top-2 right-2 h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedForExport.has(idx)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background/80 border-muted-foreground/40 hover:border-primary"
                    }`}
                  >
                    {selectedForExport.has(idx) && <Check className="h-4 w-4" />}
                  </button>
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-green-500 text-white text-xs">Generated</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                    onClick={(e) => { e.stopPropagation(); handleGenerateImage(idx); }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                  </Button>
                </div>
              ) : (
                <div className="relative aspect-video bg-muted/30 border-b border-border overflow-hidden">
                  {/* Show product image as preview */}
                  {(concept.product?.image_url || concept.product?.images?.[0]) ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={concept.product.image_url || concept.product.images![0]}
                        alt={concept.product?.name || ""}
                        className="max-h-full max-w-full object-contain opacity-30"
                      />
                    </div>
                  ) : null}
                  {/* Brand logo badge */}
                  {concept.brand_elements?.logo_url && (
                    <div className="absolute top-2 left-2">
                      <img src={concept.brand_elements.logo_url} alt="Logo" className="h-5 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateImage(idx)}
                      disabled={isGeneratingThis}
                      className="bg-background/80"
                    >
                      {isGeneratingThis ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</>
                      ) : (
                        <><ImageIcon className="h-3 w-3 mr-1" />Generate Image</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Card header */}
              <CardHeader
                className="cursor-pointer p-3"
                onClick={() => setExpandedCard(isExpanded ? null : idx)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs shrink-0">#{idx + 1}</Badge>
                      {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                      <span className="text-sm font-medium truncate">{concept.concept_name || `Concept ${idx + 1}`}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {concept.product?.name && <Badge variant="secondary" className="text-xs">{concept.product.name}</Badge>}
                      {concept.hook_type && <Badge variant="outline" className="text-xs">{concept.hook_type}</Badge>}
                      {concept.strategic_brief?.funnel_stage && <Badge variant="outline" className="text-xs">{concept.strategic_brief.funnel_stage}</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded edit form */}
              {isExpanded && (
                <CardContent className="p-3 pt-0 space-y-3 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-xs">Concept Name</Label>
                    <Input
                      value={concept.concept_name || ""}
                      onChange={(e) => updateConcept(idx, "concept_name", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  {/* Product info with image preview */}
                  <div className="flex gap-3">
                    {(concept.product?.image_url || concept.product?.images?.[0]) && (
                      <img
                        src={concept.product.image_url || concept.product.images![0]}
                        alt={concept.product?.name || ""}
                        className="h-16 w-16 rounded object-cover border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Product</Label>
                          <Input
                            value={concept.product?.name || ""}
                            onChange={(e) => updateConcept(idx, "product.name", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price</Label>
                          <Input
                            value={concept.product?.price || ""}
                            onChange={(e) => updateConcept(idx, "product.price", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Product Image URL</Label>
                        <Input
                          value={concept.product?.image_url || concept.product?.images?.[0] || ""}
                          onChange={(e) => updateConcept(idx, "product.image_url", e.target.value)}
                          className="h-9 text-xs font-mono"
                          placeholder="Product image URL"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Brand elements */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Logo URL</Label>
                      <Input
                        value={concept.brand_elements?.logo_url || ""}
                        onChange={(e) => updateConcept(idx, "brand_elements.logo_url", e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Primary Color</Label>
                      <Input
                        value={concept.brand_elements?.primary_color || ""}
                        onChange={(e) => updateConcept(idx, "brand_elements.primary_color", e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hook Type</Label>
                    <Input
                      value={concept.hook_type || ""}
                      onChange={(e) => updateConcept(idx, "hook_type", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Key Message</Label>
                    <Input
                      value={concept.strategic_brief?.key_message || ""}
                      onChange={(e) => updateConcept(idx, "strategic_brief.key_message", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reference Ad</Label>
                    <div className="flex items-center gap-2">
                      {concept.reference_ad_url ? (
                        <img
                          src={concept.reference_ad_url}
                          alt="Reference"
                          className="h-12 w-12 rounded object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded border border-dashed border-border flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        {concept.reference_ad_analysis_summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {concept.reference_ad_analysis_summary}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setRefPickerIdx(idx)}
                        >
                          {concept.reference_ad_url ? "Change Reference" : "Pick Reference Ad"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {concept.text_overlays && concept.text_overlays.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Text Overlays</Label>
                      {concept.text_overlays.map((overlay, oi) => (
                        <div key={oi} className="flex gap-1 items-center">
                          <Badge variant="outline" className="text-[8px] shrink-0">{overlay.type}</Badge>
                          <Input
                            value={overlay.text}
                            onChange={(e) => {
                              const overlays = [...(concept.text_overlays || [])];
                              overlays[oi] = { ...overlays[oi], text: e.target.value };
                              updateConcept(idx, "text_overlays", overlays);
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Image Prompt</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-xs px-2"
                        disabled={!concept.reference_ad_url || regeneratingPromptIdx === idx}
                        onClick={() => handleRegeneratePrompt(idx)}
                      >
                        {regeneratingPromptIdx === idx ? (
                          <><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />Analyzing ref...</>
                        ) : (
                          <><RefreshCw className="h-2.5 w-2.5 mr-1" />Regen from Reference</>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={concept.image_generation_prompt || ""}
                      onChange={(e) => updateConcept(idx, "image_generation_prompt", e.target.value)}
                      rows={3}
                      className="text-xs font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleGenerateImage(idx)}
                    disabled={isGeneratingThis}
                  >
                    {isGeneratingThis ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</>
                    ) : concept.image_url ? (
                      <><RefreshCw className="h-3 w-3 mr-1" />Regenerate Image</>
                    ) : (
                      <><ImageIcon className="h-3 w-3 mr-1" />Generate Image</>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Reference Ad Picker */}
      {refPickerIdx !== null && brandId && (
        <ReferenceAdPicker
          open={true}
          onOpenChange={(open) => !open && setRefPickerIdx(null)}
          brandId={brandId}
          currentUrl={concepts[refPickerIdx]?.reference_ad_url}
          onSelect={(ad) => {
            const analysis = ad.analysis || {};
            const summary = [
              analysis.archetype ? `Archetype: ${analysis.archetype}.` : "",
              typeof analysis.layout_architecture === "string" ? `Layout: ${analysis.layout_architecture.slice(0, 100)}.` : "",
              typeof analysis.persuasion_mechanics === "string" ? `Persuasion: ${analysis.persuasion_mechanics.slice(0, 100)}.` : "",
              Array.isArray(analysis.patterns) && analysis.patterns.length ? `Patterns: ${analysis.patterns.slice(0, 3).join(", ")}.` : "",
            ].filter(Boolean).join(" ");

            // Update both fields at once to avoid stale state
            const updated = [...concepts];
            updated[refPickerIdx] = {
              ...updated[refPickerIdx],
              reference_ad_url: ad.image_url,
              reference_ad_analysis_summary: summary,
            };
            setConcepts(updated);

            // Save to DB
            if (brandId) {
              axios.patch(`/api/brands/${brandId}`, { ad_concepts: updated }).catch(() => {});
            }
            setRefPickerIdx(null);
          }}
        />
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {lightboxUrl && (
            <div className="relative">
              <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => navigateLightbox(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => navigateLightbox(1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="relative w-full" style={{ height: "80vh" }}>
                <Image src={lightboxUrl} alt="" fill className="object-contain" sizes="90vw" priority />
              </div>
              <div className="flex items-center justify-between px-6 py-3 bg-black/80">
                <span className="text-white text-sm">Concept {lightboxIdx + 1}</span>
                <a href={lightboxUrl} download target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sticky export bar when items selected */}
      {selectedForExport.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-card px-6 py-3">
          <span className="text-sm font-medium">{selectedForExport.size} ads selected for export</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
            <Button size="sm" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-1" />
              Export {selectedForExport.size} Ads
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
