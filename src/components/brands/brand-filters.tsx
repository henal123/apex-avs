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

interface BrandFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
}

export function BrandFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: BrandFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={category} onValueChange={(v) => v && onCategoryChange(v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="fashion">Fashion</SelectItem>
          <SelectItem value="beauty">Beauty</SelectItem>
          <SelectItem value="health">Health</SelectItem>
          <SelectItem value="electronics">Electronics</SelectItem>
          <SelectItem value="home">Home</SelectItem>
          <SelectItem value="food">Food</SelectItem>
          <SelectItem value="ecommerce">E-commerce</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
