"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GalleryFiltersProps {
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
}

export function GalleryFilters({ filters, onFiltersChange }: GalleryFiltersProps) {
  function setFilter(key: string, value: string) {
    const next = { ...filters };
    if (value === "all" || !value) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onFiltersChange(next);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ads..."
          value={filters.search || ""}
          onChange={(e) => setFilter("search", e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.source_type || "all"}
        onValueChange={(v) => v && setFilter("source_type", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="competitor">Competitor</SelectItem>
          <SelectItem value="brand_own">Brand Own</SelectItem>
          <SelectItem value="adjacent_category">Adjacent</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.performance_tier || "all"}
        onValueChange={(v) => v && setFilter("performance_tier", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          <SelectItem value="winner">Winner (60+d)</SelectItem>
          <SelectItem value="performer">Performer (30-59d)</SelectItem>
          <SelectItem value="testing">Testing (&lt;30d)</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.analysis_status || "all"}
        onValueChange={(v) => v && setFilter("analysis_status", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Analysis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="complete">Analyzed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
