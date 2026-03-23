-- Create model_pricing table
CREATE TABLE IF NOT EXISTS public.model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL UNIQUE,
  service TEXT NOT NULL CHECK (service IN ('gemini', 'claude', 'image_gen')),
  cost_per_1k_input_tokens NUMERIC(10, 6) DEFAULT 0,
  cost_per_1k_output_tokens NUMERIC(10, 6) DEFAULT 0,
  cost_per_image NUMERIC(10, 6) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
