-- Create stage_approvals table
CREATE TABLE IF NOT EXISTS public.stage_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  org_id UUID DEFAULT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 9),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'revision_requested', 'unlocked')),
  feedback TEXT DEFAULT '',
  approved_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
