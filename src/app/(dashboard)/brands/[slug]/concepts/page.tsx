"use client";

import { ConceptCardsGrid } from "@/components/stages/stage-6/concept-cards-grid";

export default function ConceptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ad Concepts</h1>
        <p className="text-sm text-muted-foreground">
          View and edit generated ad concepts and prompts
        </p>
      </div>
      <ConceptCardsGrid />
    </div>
  );
}
