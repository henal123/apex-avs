"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApprovalBarProps {
  stageName: string;
  status: "pending" | "review" | "approved" | "rejected";
  onApprove?: () => void;
  onReject?: () => void;
  onRerun?: () => void;
  isLoading?: boolean;
  className?: string;
}

const statusColors = {
  pending: "bg-muted text-muted-foreground",
  review: "bg-blue-500/10 text-blue-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-destructive/10 text-destructive",
};

export function ApprovalBar({
  stageName,
  status,
  onApprove,
  onReject,
  onRerun,
  isLoading,
  className,
}: ApprovalBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-card px-6 py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{stageName}</span>
        <Badge variant="outline" className={statusColors[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {onRerun && (
          <Button variant="outline" size="sm" onClick={onRerun} disabled={isLoading}>
            Re-run
          </Button>
        )}
        {onReject && status === "review" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isLoading}
          >
            Request Revision
          </Button>
        )}
        {onApprove && status === "review" && (
          <Button size="sm" onClick={onApprove} disabled={isLoading}>
            {isLoading ? "Processing..." : "Approve & Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
