import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/api/pagination";
import {
  successResponse,
  unauthorizedResponse,
  validationError,
} from "@/lib/api/response";
import { createBrandSchema } from "@/lib/validation/brand";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const { page, limit, sort, order, search } = parsePagination(searchParams);
  const status = searchParams.get("status");

  let query = supabase
    .from("brands")
    .select("*", { count: "exact" })
    .eq("is_archived", status === "archived" ? true : false);

  if (search) {
    query = query.ilike("brand_name", `%${search}%`);
  }

  const slug = searchParams.get("slug");
  if (slug) {
    query = query.eq("slug", slug);
  }

  const category = searchParams.get("category");
  if (category) {
    query = query.eq("category", category);
  }

  const offset = (page! - 1) * limit!;
  query = query
    .order(sort!, { ascending: order === "asc" })
    .range(offset, offset + limit! - 1);

  const { data, error, count } = await query;

  if (error) {
    return successResponse([], buildPaginationMeta(page!, limit!, 0));
  }

  return successResponse(data, buildPaginationMeta(page!, limit!, count || 0));
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const parsed = createBrandSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      ...parsed.data,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return validationError(error.message);
  }

  return successResponse(data, undefined, 201);
}
