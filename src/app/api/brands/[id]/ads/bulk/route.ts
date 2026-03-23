import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  validationError,
} from "@/lib/api/response";
import { bulkAdActionSchema } from "@/lib/validation/ad-library";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const parsed = bulkAdActionSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error.flatten());

  const { ad_ids, action, payload } = parsed.data;
  const supabase = await createClient();

  let affected = 0;

  switch (action) {
    case "tag": {
      const { error } = await supabase
        .from("ad_library_ads")
        .update({
          source_type: (payload as Record<string, string>)?.source_type,
          source_name: (payload as Record<string, string>)?.source_name,
        })
        .in("id", ad_ids)
        .eq("brand_id", id);
      if (!error) affected = ad_ids.length;
      break;
    }
    case "flag": {
      const { error } = await supabase
        .from("ad_library_ads")
        .update({ flag: (payload as Record<string, string>)?.flag || null })
        .in("id", ad_ids)
        .eq("brand_id", id);
      if (!error) affected = ad_ids.length;
      break;
    }
    case "delete": {
      const { error } = await supabase
        .from("ad_library_ads")
        .delete()
        .in("id", ad_ids)
        .eq("brand_id", id);
      if (!error) affected = ad_ids.length;
      break;
    }
    case "reanalyze": {
      const { error } = await supabase
        .from("ad_library_ads")
        .update({ analysis_status: "pending", analysis: null })
        .in("id", ad_ids)
        .eq("brand_id", id);
      if (!error) affected = ad_ids.length;
      break;
    }
  }

  return successResponse({ action, affected });
}
