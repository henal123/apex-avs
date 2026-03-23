import type { PaginationParams, PaginationMeta } from "@/types/api";

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  return {
    page: Math.max(1, parseInt(searchParams.get("page") || "1", 10)),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10))),
    sort: searchParams.get("sort") || "created_at",
    order: (searchParams.get("order") || "desc") as "asc" | "desc",
    search: searchParams.get("search") || undefined,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
