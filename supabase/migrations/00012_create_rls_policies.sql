-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_library_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cost_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- Phase 1: Simple auth-required policies (all authenticated users can access everything)
-- Future Phase 2 will add org_id-based isolation

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- brands
CREATE POLICY "Authenticated users can view brands" ON public.brands
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create brands" ON public.brands
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update brands" ON public.brands
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete brands" ON public.brands
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- brand_assets
CREATE POLICY "Authenticated users can manage brand assets" ON public.brand_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ad_library_ads
CREATE POLICY "Authenticated users can manage ads" ON public.ad_library_ads
  FOR ALL USING (auth.uid() IS NOT NULL);

-- pipeline_jobs
CREATE POLICY "Authenticated users can manage jobs" ON public.pipeline_jobs
  FOR ALL USING (auth.uid() IS NOT NULL);

-- generated_ads
CREATE POLICY "Authenticated users can manage generated ads" ON public.generated_ads
  FOR ALL USING (auth.uid() IS NOT NULL);

-- api_cost_logs
CREATE POLICY "Authenticated users can view costs" ON public.api_cost_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service can insert costs" ON public.api_cost_logs
  FOR INSERT WITH CHECK (TRUE);

-- shared_galleries (public access for active galleries)
CREATE POLICY "Authenticated users can manage galleries" ON public.shared_galleries
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public can view active galleries" ON public.shared_galleries
  FOR SELECT USING (is_active = TRUE);

-- stage_approvals
CREATE POLICY "Authenticated users can manage approvals" ON public.stage_approvals
  FOR ALL USING (auth.uid() IS NOT NULL);

-- model_pricing (read-only for all)
CREATE POLICY "Anyone can view pricing" ON public.model_pricing
  FOR SELECT USING (TRUE);
