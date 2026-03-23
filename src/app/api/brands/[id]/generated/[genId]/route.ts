import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { genId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("generated_ads")
    .select("*")
    .eq("id", genId)
    .single();

  if (error || !data) return notFoundResponse("Generated ad");
  return successResponse(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { genId } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("generated_ads")
    .update(body)
    .eq("id", genId)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Generated ad");
  return successResponse(data);
}
