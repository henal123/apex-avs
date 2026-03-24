"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <Button onClick={reset} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}
