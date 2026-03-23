-- Create api_cost_logs table
CREATE TABLE IF NOT EXISTS public.api_cost_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  service TEXT NOT NULL CHECK (service IN (
    'gemini', 'claude', 'image_gen', 'sharp_rendering'
  )),
  model TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 9),
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);
