-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_shared_galleries_updated_at
  BEFORE UPDATE ON public.shared_galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_model_pricing_updated_at
  BEFORE UPDATE ON public.model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update last_activity_at on brands when related records change
CREATE OR REPLACE FUNCTION public.update_brand_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.brands
  SET last_activity_at = NOW()
  WHERE id = NEW.brand_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_brand_activity_on_ad
  AFTER INSERT OR UPDATE ON public.ad_library_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_brand_activity();

CREATE TRIGGER update_brand_activity_on_job
  AFTER INSERT OR UPDATE ON public.pipeline_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_brand_activity();

CREATE TRIGGER update_brand_activity_on_gen
  AFTER INSERT OR UPDATE ON public.generated_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_brand_activity();

-- Auto-calculate performance tier from days_running
CREATE OR REPLACE FUNCTION public.auto_performance_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.days_running IS NOT NULL AND OLD.days_running IS DISTINCT FROM NEW.days_running THEN
    IF NEW.days_running >= 60 THEN
      NEW.performance_tier := 'winner';
    ELSIF NEW.days_running >= 30 THEN
      NEW.performance_tier := 'performer';
    ELSE
      NEW.performance_tier := 'testing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_tier_on_ad_update
  BEFORE UPDATE ON public.ad_library_ads
  FOR EACH ROW EXECUTE FUNCTION public.auto_performance_tier();
