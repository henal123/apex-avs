"use client";

import { Stage4Container } from "@/components/stages/stage-4/stage-4-container";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analysis Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          View and edit AI-generated ad analyses
        </p>
      </div>
      <Stage4Container />
    </div>
  );
}
