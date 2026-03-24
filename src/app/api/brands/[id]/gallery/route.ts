import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/api/auth";
import { successResponse, unauthorizedResponse, validationError } from "@/lib/api/response";
import { createGallerySchema } from "@/lib/validation/generation";
import { hashPassword } from "@/lib/api/password";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("shared_galleries")
    .select("*")
    .eq("brand_id", id)
    .order("created_at", { ascending: false });

  return successResponse(data || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const parsed = createGallerySchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error.flatten());

  const supabase = await createClient();
  const shareToken = nanoid(21);

  const { data, error } = await supabase
    .from("shared_galleries")
    .insert({
      brand_id: id,
      share_token: shareToken,
      title: parsed.data.title,
      description: parsed.data.description,
      selected_ad_ids: parsed.data.selected_ad_ids,
      is_password_protected: parsed.data.is_password_protected,
      password_hash: parsed.data.password ? await hashPassword(parsed.data.password) : null,
      expires_at: parsed.data.expires_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return validationError(error.message);

  return successResponse({
    ...data,
    share_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/gallery/${shareToken}`,
  }, undefined, 201);
}
