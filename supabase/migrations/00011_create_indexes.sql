-- Performance indexes

-- brands
CREATE INDEX idx_brands_owner ON public.brands(owner_id);
CREATE INDEX idx_brands_org ON public.brands(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_brands_slug ON public.brands(slug);
CREATE INDEX idx_brands_archived ON public.brands(is_archived);
CREATE INDEX idx_brands_pipeline ON public.brands(pipeline_status);
CREATE INDEX idx_brands_last_activity ON public.brands(last_activity_at DESC);

-- brand_assets
CREATE INDEX idx_brand_assets_brand ON public.brand_assets(brand_id);
CREATE INDEX idx_brand_assets_type ON public.brand_assets(brand_id, asset_type);

-- ad_library_ads
CREATE INDEX idx_ads_brand ON public.ad_library_ads(brand_id);
CREATE INDEX idx_ads_source ON public.ad_library_ads(brand_id, source_type);
CREATE INDEX idx_ads_tier ON public.ad_library_ads(brand_id, performance_tier);
CREATE INDEX idx_ads_analysis_status ON public.ad_library_ads(brand_id, analysis_status);
CREATE INDEX idx_ads_flag ON public.ad_library_ads(brand_id, flag) WHERE flag IS NOT NULL;

-- pipeline_jobs
CREATE INDEX idx_jobs_brand ON public.pipeline_jobs(brand_id);
CREATE INDEX idx_jobs_brand_stage ON public.pipeline_jobs(brand_id, stage);
CREATE INDEX idx_jobs_status ON public.pipeline_jobs(status) WHERE status IN ('queued', 'processing');

-- generated_ads
CREATE INDEX idx_gen_brand ON public.generated_ads(brand_id);
CREATE INDEX idx_gen_concept ON public.generated_ads(brand_id, concept_number, variant_number);
CREATE INDEX idx_gen_selected ON public.generated_ads(brand_id, is_selected) WHERE is_selected = TRUE;

-- api_cost_logs
CREATE INDEX idx_costs_brand ON public.api_cost_logs(brand_id);
CREATE INDEX idx_costs_date ON public.api_cost_logs(date);
CREATE INDEX idx_costs_brand_date ON public.api_cost_logs(brand_id, date);
CREATE INDEX idx_costs_service ON public.api_cost_logs(service);

-- shared_galleries
CREATE INDEX idx_galleries_token ON public.shared_galleries(share_token);
CREATE INDEX idx_galleries_brand ON public.shared_galleries(brand_id);

-- stage_approvals
CREATE INDEX idx_approvals_brand ON public.stage_approvals(brand_id);
CREATE INDEX idx_approvals_brand_stage ON public.stage_approvals(brand_id, stage);
