import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // Get all ads for counts
  const { data: ads } = await supabase
    .from("ad_library_ads")
    .select("source_type, performance_tier, flag, analysis_status")
    .eq("brand_id", id);

  const allAds = ads || [];

  const bySource: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const byAnalysis: Record<string, number> = {};
  let flaggedRef = 0;
  let flaggedIgnore = 0;

  for (const ad of allAds) {
    bySource[ad.source_type] = (bySource[ad.source_type] || 0) + 1;
    byTier[ad.performance_tier] = (byTier[ad.performance_tier] || 0) + 1;
    byAnalysis[ad.analysis_status] = (byAnalysis[ad.analysis_status] || 0) + 1;
    if (ad.flag === "reference") flaggedRef++;
    if (ad.flag === "ignore") flaggedIgnore++;
  }

  return successResponse({
    total: allAds.length,
    by_source: bySource,
    by_tier: byTier,
    by_analysis: byAnalysis,
    flagged_reference: flaggedRef,
    flagged_ignore: flaggedIgnore,
  });
}
