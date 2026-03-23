"use client";

import { Construction } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";

export default function CostDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Cost Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track API costs across all brands
        </p>
      </div>

      <EmptyState
        icon={<Construction className="h-12 w-12" />}
        title="Coming Soon"
        description="The cost dashboard will be available after you start generating ad creatives."
      />
    </div>
  );
}
