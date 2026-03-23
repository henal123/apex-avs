"use client";

import axios from "axios";
import { X, Tag, Flag, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdLibraryStore } from "@/stores/ad-library-store";
import { toast } from "sonner";

interface BulkActionBarProps {
  brandId: string;
  onActionComplete: () => void;
}

export function BulkActionBar({ brandId, onActionComplete }: BulkActionBarProps) {
  const { selectedIds, clearSelection } = useAdLibraryStore();

  async function handleBulkAction(action: string, payload?: Record<string, unknown>) {
    try {
      await axios.post(`/api/brands/${brandId}/ads/bulk`, {
        ad_ids: selectedIds,
        action,
        payload,
      });
      toast.success(`${action} applied to ${selectedIds.length} ads`);
      clearSelection();
      onActionComplete();
    } catch {
      toast.error("Bulk action failed");
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleBulkAction("flag", { flag: "reference" })}
      >
        <Flag className="h-3 w-3 mr-1" />
        Reference
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleBulkAction("flag", { flag: "ignore" })}
      >
        <Flag className="h-3 w-3 mr-1" />
        Ignore
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleBulkAction("flag", { flag: null })}
      >
        Unflag
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleBulkAction("delete")}
        className="text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </Button>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={clearSelection}>
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
