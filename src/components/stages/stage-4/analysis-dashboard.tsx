"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye } from "lucide-react";
import { AnalysisDetailModal } from "./analysis-detail-modal";
import { cn } from "@/lib/utils";
import type { AdLibraryAd, AdAnalysis } from "@/types/ad-library";

interface AnalysisDashboardProps {
  ads: AdLibraryAd[];
  brandId: string;
  onUpdate: () => void;
}

export function AnalysisDashboard({ ads, brandId, onUpdate }: AnalysisDashboardProps) {
  const [selectedAd, setSelectedAd] = useState<AdLibraryAd | null>(null);

  const analyzedAds = ads.filter((a) => a.analysis_status === "complete" && a.analysis);
  const failedAds = ads.filter((a) => a.analysis_status === "failed");

  // Compute aggregate stats
  const archetypes: Record<string, number> = {};
  let totalCreativeQuality = 0;
  let totalScrollStopping = 0;
  let totalConversion = 0;

  for (const ad of analyzedAds) {
    const analysis = ad.analysis as AdAnalysis;
    if (analysis?.archetype) {
      const archetypeName = typeof analysis.archetype === "string"
        ? analysis.archetype
        : JSON.stringify(analysis.archetype);
      archetypes[archetypeName] = (archetypes[archetypeName] || 0) + 1;
    }
    const scores = analysis?.overall_scores || {};
    totalCreativeQuality += (scores.creative_quality as number) || 0;
    totalScrollStopping += (scores.scroll_stopping_power as number) || 0;
    totalConversion += (scores.conversion_potential as number) || 0;
  }

  const count = analyzedAds.length || 1;
  const avgCreative = (totalCreativeQuality / count).toFixed(1);
  const avgScroll = (totalScrollStopping / count).toFixed(1);
  const avgConversion = (totalConversion / count).toFixed(1);

  const topArchetypes = Object.entries(archetypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{analyzedAds.length}</p>
            <p className="text-xs text-muted-foreground">Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{avgCreative}</p>
            <p className="text-xs text-muted-foreground">Avg Creative Quality</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{avgScroll}</p>
            <p className="text-xs text-muted-foreground">Avg Scroll Stopping</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{avgConversion}</p>
            <p className="text-xs text-muted-foreground">Avg Conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Top archetypes */}
      {topArchetypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Creative Archetypes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topArchetypes.map(([name, count]) => (
                <Badge key={name} variant="secondary" className="text-sm">
                  {name} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed ads */}
      {failedAds.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              {failedAds.length} ads failed analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analyzed ads grid */}
      <div>
        <h3 className="text-sm font-medium mb-3">Analyzed Ads ({analyzedAds.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {analyzedAds.map((ad) => {
            const analysis = ad.analysis as AdAnalysis;
            const scores = analysis?.overall_scores || {};
            return (
              <div
                key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className="group relative rounded-lg border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
              >
                <div className="relative aspect-square">
                  <Image
                    src={ad.thumbnail_url || ad.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate">
                    {typeof analysis?.archetype === "string" ? analysis.archetype : JSON.stringify(analysis?.archetype || "Unknown")}
                  </p>
                  <div className="flex gap-1">
                    {["creative_quality", "scroll_stopping_power", "conversion_potential"].map(
                      (key) => {
                        const val = (scores as Record<string, number>)[key] || 0;
                        return (
                          <div
                            key={key}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              val >= 7 ? "bg-green-500" : val >= 4 ? "bg-yellow-500" : "bg-red-500"
                            )}
                          />
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selectedAd && (
        <AnalysisDetailModal
          ad={selectedAd}
          brandId={brandId}
          open={!!selectedAd}
          onOpenChange={(open) => !open && setSelectedAd(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
