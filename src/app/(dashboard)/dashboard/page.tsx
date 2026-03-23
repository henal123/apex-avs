"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandCard } from "@/components/brands/brand-card";
import { BrandFilters } from "@/components/brands/brand-filters";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrands } from "@/hooks/use-brands";

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data, isLoading } = useBrands({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
  });

  const brands = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Brands</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your ad creative projects
          </p>
        </div>
        <Button onClick={() => router.push("/brands/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Brand
        </Button>
      </div>

      {/* Filters */}
      <BrandFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-12 w-12" />}
          title="No brands yet"
          description="Create your first brand to start generating ad creatives"
          action={
            <Button onClick={() => router.push("/brands/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Brand
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  );
}
