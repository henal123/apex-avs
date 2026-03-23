"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import {
  Type,
  Undo2,
  Redo2,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Using native range input instead of shadcn Slider (base-ui script tag issue)
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/stores/canvas-store";
import { useBrandStore } from "@/stores/brand-store";
import { ColorSwatchPicker } from "@/components/common/color-swatch-picker";
import { toast } from "sonner";
import type { GeneratedAd } from "@/types/generation";
import type { ApiResponse } from "@/types/api";

export default function CanvasEditorPage() {
  const params = useParams();
  const router = useRouter();
  const adId = params.adId as string;
  const { activeBrand } = useBrandStore();
  const {
    textOverlays,
    selectedOverlayId,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    setSelectedOverlay,
    loadSpec,
    getSpec,
    undo,
    redo,
    undoStack,
    redoStack,
  } = useCanvasStore();

  const brandId = activeBrand?.id;

  const { data: ad } = useQuery({
    queryKey: ["gen-ad", adId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<GeneratedAd>>(
        `/api/brands/${brandId}/generated/${adId}`
      );
      return data.data;
    },
    enabled: !!brandId && !!adId,
  });

  useEffect(() => {
    if (ad?.compositing_spec) {
      loadSpec(ad.compositing_spec);
    }
  }, [ad, loadSpec]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  const selectedOverlay = textOverlays.find((o) => o.id === selectedOverlayId);

  async function handleSave() {
    if (!brandId || !adId) return;
    try {
      const spec = getSpec();
      await axios.post(`/api/brands/${brandId}/generated/${adId}/composite`, {
        compositing_spec: spec,
      });
      toast.success("Compositing saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  if (!ad) return null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Left: Canvas preview */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-4 relative">
        <div className="relative" style={{ width: 500, height: 500 }}>
          {/* Base image */}
          {ad.raw_image_url && (
            <Image
              src={ad.raw_image_url}
              alt=""
              fill
              className="object-contain rounded-lg"
            />
          )}
          {/* Text overlay preview */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              onClick={() => setSelectedOverlay(overlay.id)}
              className={`absolute cursor-pointer transition-all ${
                overlay.id === selectedOverlayId ? "ring-2 ring-primary" : ""
              }`}
              style={{
                left: `${(overlay.x / 1080) * 100}%`,
                top: `${(overlay.y / 1080) * 100}%`,
                transform: "translate(-50%, -50%)",
                fontSize: `${overlay.fontSize * (500 / 1080)}px`,
                fontWeight: overlay.fontWeight,
                color: overlay.fill,
                textAlign: overlay.textAlign as "left" | "center" | "right",
                textTransform: overlay.textCase === "uppercase" ? "uppercase" : overlay.textCase === "lowercase" ? "lowercase" : "none",
                textShadow: overlay.shadow.enabled
                  ? `${overlay.shadow.offsetX}px ${overlay.shadow.offsetY}px ${overlay.shadow.blur}px ${overlay.shadow.color}`
                  : undefined,
                ...(overlay.background.enabled && {
                  backgroundColor: overlay.background.color,
                  padding: `${overlay.background.padding * (500 / 1080)}px`,
                  borderRadius: `${overlay.background.borderRadius}px`,
                  opacity: overlay.background.opacity,
                }),
              }}
            >
              {overlay.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Controls panel */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Add text */}
            <Button variant="outline" className="w-full" onClick={() => addTextOverlay()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Text Layer
            </Button>

            {/* Layer list */}
            <div className="space-y-1">
              <Label className="text-xs">Layers</Label>
              {textOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  onClick={() => setSelectedOverlay(overlay.id)}
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer ${
                    overlay.id === selectedOverlayId ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Type className="h-3 w-3 shrink-0" />
                    <span className="truncate">{overlay.text}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTextOverlay(overlay.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Selected overlay properties */}
            {selectedOverlay && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-xs">Text Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={selectedOverlay.text}
                        onChange={(e) =>
                          updateTextOverlay(selectedOverlay.id, { text: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Font Size</Label>
                      <input
                        type="range"
                        value={selectedOverlay.fontSize}
                        onChange={(e) =>
                          updateTextOverlay(selectedOverlay.id, {
                            fontSize: parseInt(e.target.value),
                          })
                        }
                        min={12}
                        max={120}
                        step={1}
                        className="w-full accent-primary"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {selectedOverlay.fontSize}px
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <ColorSwatchPicker
                        color={selectedOverlay.fill}
                        onChange={(c) =>
                          updateTextOverlay(selectedOverlay.id, { fill: c })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Position X</Label>
                      <input
                        type="range"
                        value={selectedOverlay.x}
                        onChange={(e) =>
                          updateTextOverlay(selectedOverlay.id, {
                            x: parseInt(e.target.value),
                          })
                        }
                        min={0}
                        max={1080}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Position Y</Label>
                      <input
                        type="range"
                        value={selectedOverlay.y}
                        onChange={(e) =>
                          updateTextOverlay(selectedOverlay.id, {
                            y: parseInt(e.target.value),
                          })
                        }
                        min={0}
                        max={1080}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Shadow</Label>
                      <Switch
                        checked={selectedOverlay.shadow.enabled}
                        onCheckedChange={(v) =>
                          updateTextOverlay(selectedOverlay.id, {
                            shadow: { ...selectedOverlay.shadow, enabled: v },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
