import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api/response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .update({ is_archived: false, archived_at: null })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Brand");

  return successResponse(data);
}
