"use client";

import { useBrandStore } from "@/stores/brand-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Layers,
  Target,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { IntelligenceReport } from "@/types/brand";

export function ReportDashboard() {
  const { activeBrand } = useBrandStore();
  const report = activeBrand?.creative_intelligence_report as IntelligenceReport | null;

  if (!report) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No intelligence report available
      </div>
    );
  }

  // Helper: patterns can be strings or objects
  function renderPatternItem(item: unknown, i: number, variant: "success" | "destructive") {
    if (typeof item === "string") {
      return (
        <div key={i} className="rounded-md border border-border p-3">
          <p className="text-sm">{item}</p>
        </div>
      );
    }
    const p = item as Record<string, unknown>;
    return (
      <div key={i} className="rounded-md border border-border p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{String(p.name || p.pattern_name || "")}</span>
          {p.score !== undefined && (
            <Badge variant="outline" className={variant === "success" ? "text-green-500" : "text-destructive"}>
              Score: {String(p.score)}
            </Badge>
          )}
        </div>
        {p.description !== undefined && <p className="text-xs text-muted-foreground">{String(p.description)}</p>}
        {p.frequency !== undefined && <p className="text-xs text-muted-foreground">Frequency: {String(p.frequency)}</p>}
      </div>
    );
  }

  // Helper: clusters can have different field names
  function renderCluster(item: unknown, i: number) {
    const c = item as Record<string, unknown>;
    const name = String(c.name || c.cluster_name || `Cluster ${i + 1}`);
    const desc = String(c.description || "");
    const traits = (c.traits || c.archetypes || []) as string[];
    const adCount = c.ad_count || c.count || 0;
    const avgScore = c.avg_score || c.average_score || 0;

    return (
      <div key={i} className="rounded-lg border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{name}</span>
          {Number(adCount) > 0 && <Badge variant="secondary">{String(adCount)} ads</Badge>}
        </div>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {traits.map((trait, j) => (
              <Badge key={j} variant="outline" className="text-[10px]">{String(trait)}</Badge>
            ))}
          </div>
        )}
        {Number(avgScore) > 0 && (
          <p className="text-xs">Avg Score: <span className="font-mono font-bold">{Number(avgScore).toFixed(1)}</span></p>
        )}
      </div>
    );
  }

  // Helper: concept directions
  function renderDirection(item: unknown, i: number) {
    const d = item as Record<string, unknown>;
    const name = String(d.name || d.concept_name || `Concept ${i + 1}`);
    const archetype = String(d.archetype || "");
    const hookType = String(d.hook_type || d.hook || "");
    const funnelStage = String(d.funnel_stage || d.stage || "");
    const rationale = String(d.rationale || d.description || "");
    const patterns = (d.supporting_patterns || d.patterns || []) as string[];

    return (
      <div key={i} className="rounded-lg border-2 border-primary/20 p-4 space-y-3">
        <div>
          <Badge className="mb-1">Concept {i + 1}</Badge>
          <h4 className="text-sm font-semibold">{name}</h4>
        </div>
        <div className="flex flex-wrap gap-1">
          {archetype && <Badge variant="outline" className="text-[10px]">{archetype}</Badge>}
          {hookType && <Badge variant="outline" className="text-[10px]">{hookType}</Badge>}
          {funnelStage && <Badge variant="outline" className="text-[10px]">{funnelStage}</Badge>}
        </div>
        {rationale && <p className="text-xs text-muted-foreground">{rationale}</p>}
        {patterns.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patterns.map((p, j) => (
              <Badge key={j} variant="secondary" className="text-[10px]">{String(p)}</Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Extract data with flexible field names
  const winningPatterns = (report.winning_creative_patterns || (report as unknown as Record<string, unknown>).winning_patterns || []) as unknown[];
  const clusters = (report.creative_archetype_clusters || (report as unknown as Record<string, unknown>).archetype_clusters || []) as unknown[];
  const compIntel = ((report.competitive_creative_intelligence || (report as unknown as Record<string, unknown>).competitive_intelligence || {}) as unknown) as Record<string, unknown>;
  const failurePatterns = (report.failure_patterns || []) as unknown[];
  const recommendations = (report.strategic_recommendations || (report as unknown as Record<string, unknown>).recommendations || {}) as Record<string, unknown>;
  const conceptDirections = (recommendations.four_ad_concept_directions || recommendations.concept_directions || recommendations.concepts || []) as unknown[];
  const generalRecs = (recommendations.general_recommendations || []) as string[];

  // Competitive intel can have gaps as strings, arrays, or objects
  function toStringArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map((v) => typeof v === "string" ? v : String((v as Record<string, unknown>)?.description || JSON.stringify(v)));
    if (typeof val === "string") return [val];
    return [];
  }
  const gaps = toStringArray(compIntel.gaps);
  const opportunities = toStringArray(compIntel.opportunities);
  const threats = toStringArray(compIntel.threats);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-lg font-semibold">Creative Intelligence Report</h2>
        <p className="text-sm text-muted-foreground">
          AI-synthesized strategic insights from ad analysis data
        </p>
      </div>

      {/* Winning Patterns */}
      {winningPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Winning Creative Patterns ({winningPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {winningPatterns.map((p, i) => renderPatternItem(p, i, "success"))}
          </CardContent>
        </Card>
      )}

      {/* Archetype Clusters */}
      {clusters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Creative Archetype Clusters ({clusters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clusters.map((c, i) => renderCluster(c, i))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitive Intel */}
      {(gaps.length > 0 || opportunities.length > 0 || threats.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Competitive Creative Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gaps.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Gaps</label>
                <ul className="space-y-1">
                  {gaps.map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-purple-500/30 py-1">{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {opportunities.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Opportunities</label>
                <ul className="space-y-1">
                  {opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-green-500/30 py-1">{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {threats.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Threats</label>
                <ul className="space-y-1">
                  {threats.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-red-500/30 py-1">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failure Patterns */}
      {failurePatterns.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Failure Patterns ({failurePatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {failurePatterns.map((p, i) => renderPatternItem(p, i, "destructive"))}
          </CardContent>
        </Card>
      )}

      {/* General Recommendations */}
      {generalRecs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {generalRecs.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30 py-1">
                  {typeof r === "string" ? r : JSON.stringify(r)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* 4 Concept Directions */}
      {conceptDirections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Strategic Concept Directions ({conceptDirections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conceptDirections.map((d, i) => renderDirection(d, i))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
