-- Create pipeline_jobs table
CREATE TABLE IF NOT EXISTS public.pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 9),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'processing', 'complete', 'failed', 'cancelled'
  )),
  progress JSONB DEFAULT '{"items_total": 0, "items_processed": 0, "items_failed": 0, "current_item": null, "percent": 0}',
  config JSONB DEFAULT '{}',
  result JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
