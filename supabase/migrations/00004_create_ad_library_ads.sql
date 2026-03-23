-- Create ad_library_ads table
CREATE TABLE IF NOT EXISTS public.ad_library_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'competitor' CHECK (source_type IN (
    'brand_own', 'competitor', 'adjacent_category'
  )),
  source_name TEXT DEFAULT '',
  performance_tier TEXT NOT NULL DEFAULT 'unknown' CHECK (performance_tier IN (
    'winner', 'performer', 'testing', 'unknown'
  )),
  flag TEXT DEFAULT NULL CHECK (flag IS NULL OR flag IN ('reference', 'ignore')),
  ad_copy JSONB DEFAULT '{}',
  days_running INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT NULL,
  user_tags TEXT[] DEFAULT '{}',
  analysis JSONB DEFAULT NULL,
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN (
    'pending', 'processing', 'complete', 'failed'
  )),
  user_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edit_history JSONB[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
