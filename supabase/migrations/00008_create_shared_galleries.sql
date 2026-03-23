-- Create shared_galleries table
CREATE TABLE IF NOT EXISTS public.shared_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  share_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  selected_ad_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_password_protected BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
