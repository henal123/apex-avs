"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Flag, Star, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdLibraryStore } from "@/stores/ad-library-store";
import { cn } from "@/lib/utils";
import type { AdLibraryAd } from "@/types/ad-library";

interface AdCardProps {
  ad: AdLibraryAd;
  onEdit: (ad: AdLibraryAd) => void;
  onDelete: (id: string) => void;
}

const sourceColors: Record<string, string> = {
  competitor: "bg-blue-500/10 text-blue-500",
  brand_own: "bg-green-500/10 text-green-500",
  adjacent_category: "bg-purple-500/10 text-purple-500",
};

const tierColors: Record<string, string> = {
  winner: "bg-green-500/10 text-green-500",
  performer: "bg-blue-500/10 text-blue-500",
  testing: "bg-yellow-500/10 text-yellow-500",
  unknown: "bg-muted text-muted-foreground",
};

export function AdCard({ ad, onEdit, onDelete }: AdCardProps) {
  const { selectedIds, toggleSelection } = useAdLibraryStore();
  const isSelected = selectedIds.includes(ad.id);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-all",
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* Image */}
      <div
        className="relative aspect-square cursor-pointer"
        onClick={() => onEdit(ad)}
      >
        <Image
          src={ad.image_url}
          alt={ad.source_name || "Ad"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {/* Selection checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(ad.id);
          }}
          className={cn(
            "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded border transition-all",
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-background/80 border-border opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </button>

        {/* Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded bg-background/80">
              <MoreVertical className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(ad)}>
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(ad.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Flag indicator */}
        {ad.flag && (
          <div className="absolute bottom-2 right-2">
            <Flag
              className={cn(
                "h-4 w-4",
                ad.flag === "reference" ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
              )}
            />
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 p-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0", sourceColors[ad.source_type])}
        >
          {ad.source_type.replace("_", " ")}
        </Badge>
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0", tierColors[ad.performance_tier])}
        >
          {ad.performance_tier}
        </Badge>
        {ad.source_name && (
          <span className="text-[10px] text-muted-foreground truncate">
            {ad.source_name}
          </span>
        )}
      </div>
    </div>
  );
}
