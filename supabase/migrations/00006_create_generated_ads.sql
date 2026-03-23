-- Create generated_ads table
CREATE TABLE IF NOT EXISTS public.generated_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  concept_number INTEGER NOT NULL CHECK (concept_number BETWEEN 1 AND 4),
  variant_number INTEGER NOT NULL CHECK (variant_number BETWEEN 1 AND 3),
  cycle_number INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  seed INTEGER,
  raw_image_url TEXT,
  compositing_spec JSONB DEFAULT NULL,
  final_image_url TEXT DEFAULT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  qa_result JSONB DEFAULT NULL,
  qa_passed BOOLEAN DEFAULT NULL,
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN (
    'pending', 'generating', 'complete', 'failed'
  )),
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at TIMESTAMPTZ DEFAULT NULL,
  composited_at TIMESTAMPTZ DEFAULT NULL
);
