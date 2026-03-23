"use client";

import { Stage3Container } from "@/components/stages/stage-3/stage-3-container";

export default function AdLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ad Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage competitor ads outside the pipeline flow
        </p>
      </div>
      <Stage3Container />
    </div>
  );
}
