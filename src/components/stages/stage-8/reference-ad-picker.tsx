"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

interface RefAd {
  id: string;
  image_url: string;
  source_type: string;
  source_name: string;
  performance_tier: string;
  analysis: {
    archetype?: string | Record<string, unknown>;
    layout_architecture?: string;
    persuasion_mechanics?: string;
    typography_analysis?: string;
    overall_scores?: Record<string, number>;
    patterns?: string[];
  } | null;
}

interface ReferenceAdPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentUrl?: string;
  onSelect: (ad: RefAd) => void;
}

export function ReferenceAdPicker({
  open,
  onOpenChange,
  brandId,
  currentUrl,
  onSelect,
}: ReferenceAdPickerProps) {
  const [ads, setAds] = useState<RefAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && brandId) {
      setLoading(true);
      axios
        .get<ApiResponse<RefAd[]>>(
          `/api/brands/${brandId}/ads?limit=200&analysis_status=complete`
        )
        .then((resp) => {
          setAds(resp.data.data || []);
          // Pre-select current reference ad
          if (currentUrl) {
            const found = (resp.data.data || []).find((a) => a.image_url === currentUrl);
            if (found) setSelectedId(found.id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, brandId, currentUrl]);

  const filteredAds = search
    ? ads.filter(
        (a) =>
          a.source_name?.toLowerCase().includes(search.toLowerCase()) ||
          (typeof a.analysis?.archetype === "string" ? a.analysis.archetype : JSON.stringify(a.analysis?.archetype || "")).toLowerCase().includes(search.toLowerCase()) ||
          a.source_type?.toLowerCase().includes(search.toLowerCase())
      )
    : ads;

  const selectedAd = ads.find((a) => a.id === selectedId);

  function handleConfirm() {
    if (selectedAd) {
      onSelect(selectedAd);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl shadow-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight">Select Reference Ad</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a reference ad whose style, layout, and persuasion pattern will be replicated
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by source, archetype, type..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading ads...</div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No analyzed ads found</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAds.map((ad) => {
                const isSelected = selectedId === ad.id;
                const scores = ad.analysis?.overall_scores || {};
                const avgScore = Object.values(scores).length > 0
                  ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)
                  : null;

                return (
                  <div
                    key={ad.id}
                    onClick={() => setSelectedId(ad.id)}
                    className={cn(
                      "group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Image */}
                    <div className="relative aspect-square">
                      <Image
                        src={ad.image_url}
                        alt={ad.source_name || "Ad"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 20vw"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-xs font-medium truncate">
                        {typeof ad.analysis?.archetype === "string" ? ad.analysis.archetype : JSON.stringify(ad.analysis?.archetype || "Unknown")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0 rounded-full",
                            ad.performance_tier === "winner" && "text-green-500 border-green-500/30",
                            ad.performance_tier === "performer" && "text-blue-500 border-blue-500/30"
                          )}
                        >
                          {ad.performance_tier}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 rounded-full">
                          {ad.source_type.replace("_", " ")}
                        </Badge>
                        {avgScore && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 rounded-full">
                            {avgScore}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected ad detail + confirm */}
        <div className="glass border-t border-border/50 shrink-0 flex items-center justify-between px-6 py-4">
          <div className="flex-1 min-w-0">
            {selectedAd ? (
              <div className="flex items-center gap-3">
                <img
                  src={selectedAd.image_url}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover border border-border"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {typeof selectedAd.analysis?.archetype === "string" ? selectedAd.analysis.archetype : JSON.stringify(selectedAd.analysis?.archetype || "Selected")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedAd.source_name || selectedAd.source_type} • {selectedAd.performance_tier}
                    {Array.isArray(selectedAd.analysis?.patterns) && selectedAd.analysis.patterns.length
                      ? ` • ${selectedAd.analysis.patterns.slice(0, 2).join(", ")}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Click an ad to select it as reference</p>
            )}
          </div>
          <Button onClick={handleConfirm} disabled={!selectedAd} size="sm" className="rounded-lg">
            Use This Reference
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
