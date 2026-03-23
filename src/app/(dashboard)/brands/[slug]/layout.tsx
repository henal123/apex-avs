"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useBrandStore } from "@/stores/brand-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import type { Brand } from "@/types/brand";
import type { ApiResponse } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const { setActiveBrand } = useBrandStore();
  const { initFromBrand } = usePipelineStore();

  // First get brand by slug
  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-by-slug", slug],
    queryFn: async () => {
      // Get brand by slug directly
      const { data } = await axios.get<ApiResponse<Brand[]>>(
        `/api/brands?slug=${slug}&limit=1`
      );
      const found = data.data?.[0];
      if (!found) throw new Error("Brand not found");

      // Fetch full brand details
      const { data: fullData } = await axios.get<ApiResponse<Brand>>(
        `/api/brands/${found.id}`
      );
      return fullData.data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (brand) {
      setActiveBrand(brand);
      initFromBrand(brand.pipeline_status, brand.current_stage_status);
    }
    return () => setActiveBrand(null);
  }, [brand, setActiveBrand, initFromBrand]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Brand not found</p>
      </div>
    );
  }

  return <>{children}</>;
}
