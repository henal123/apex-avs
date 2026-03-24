"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Try Again
      </Button>
    </div>
  );
}
