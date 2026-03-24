import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/api/pagination";
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const { page, limit, sort, order } = parsePagination(searchParams);
  const supabase = await createClient();

  const offset = (page! - 1) * limit!;
  const { data, error, count } = await supabase
    .from("generated_ads")
    .select("*", { count: "exact" })
    .eq("brand_id", id)
    .order(sort!, { ascending: order === "asc" })
    .range(offset, offset + limit! - 1);

  if (error) {
    console.error("Failed to fetch generated ads:", error.message);
    return errorResponse("DB_ERROR", "Failed to fetch generated ads", 500);
  }

  return successResponse(data || [], buildPaginationMeta(page!, limit!, count || 0));
}
