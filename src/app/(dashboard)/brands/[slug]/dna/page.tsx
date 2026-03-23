"use client";

import { BrandDNAEditor } from "@/components/stages/stage-2/brand-dna-editor";

export default function BrandDNAPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand DNA Editor</h1>
        <p className="text-sm text-muted-foreground">
          View and edit the Brand DNA document outside the pipeline flow
        </p>
      </div>
      <BrandDNAEditor />
    </div>
  );
}
