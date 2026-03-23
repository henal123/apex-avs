import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { Brand } from "@/types/brand";
import type { ApiResponse, PaginationMeta } from "@/types/api";

interface UseBrandsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
  order?: string;
}

export function useBrands(params: UseBrandsParams = {}) {
  return useQuery({
    queryKey: ["brands", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.search) searchParams.set("search", params.search);
      if (params.category) searchParams.set("category", params.category);
      if (params.status) searchParams.set("status", params.status);
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.order) searchParams.set("order", params.order);

      const { data } = await axios.get<ApiResponse<Brand[]> & { meta: PaginationMeta }>(
        `/api/brands?${searchParams.toString()}`
      );
      return data;
    },
  });
}

export function useBrand(id: string) {
  return useQuery({
    queryKey: ["brand", id],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Brand>>(`/api/brands/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
