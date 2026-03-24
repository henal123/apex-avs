import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/api/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/api/pagination";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const { page, limit, sort, order, search } = parsePagination(searchParams);

  const supabase = await createClient();

  let query = supabase
    .from("ad_library_ads")
    .select("*", { count: "exact" })
    .eq("brand_id", id);

  // Filters
  const sourceType = searchParams.get("source_type");
  if (sourceType) query = query.eq("source_type", sourceType);

  const tier = searchParams.get("performance_tier");
  if (tier) query = query.eq("performance_tier", tier);

  const flag = searchParams.get("flag");
  if (flag === "reference" || flag === "ignore") query = query.eq("flag", flag);
  if (flag === "none") query = query.is("flag", null);

  const analysisStatus = searchParams.get("analysis_status");
  if (analysisStatus) query = query.eq("analysis_status", analysisStatus);

  if (search) {
    query = query.or(`source_name.ilike.%${search}%,ad_copy->>headline.ilike.%${search}%`);
  }

  const offset = (page! - 1) * limit!;
  query = query
    .order(sort!, { ascending: order === "asc" })
    .range(offset, offset + limit! - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("Failed to fetch ads:", error.message);
    return errorResponse("DB_ERROR", "Failed to fetch ads", 500);
  }

  return successResponse(data, buildPaginationMeta(page!, limit!, count || 0));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Handle multipart form data
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const sourceType = (formData.get("source_type") as string) || "competitor";
  const sourceName = (formData.get("source_name") as string) || "";

  if (!files.length) {
    return errorResponse("NO_FILES", "At least one file is required");
  }

  const uploaded: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const file of files) {
    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      errors.push(`${file.name}: invalid type ${file.type}`);
      continue;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`${file.name}: exceeds 10MB`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${id}/${sourceType}/${fileName}`;

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { error: uploadError } = await adminClient.storage
      .from("ad-library")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      errors.push(`${file.name}: upload failed - ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("ad-library")
      .getPublicUrl(storagePath);

    // Create ad record using user's client (respects RLS for insert)
    const { data: adRecord, error: insertError } = await supabase
      .from("ad_library_ads")
      .insert({
        brand_id: id,
        image_url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        source_type: sourceType,
        source_name: sourceName,
      })
      .select()
      .single();

    if (insertError) {
      errors.push(`${file.name}: db insert failed - ${insertError.message}`);
      continue;
    }

    if (adRecord) {
      uploaded.push(adRecord);
    }
  }

  return successResponse({ uploaded, errors, total: uploaded.length }, undefined, 201);
}
