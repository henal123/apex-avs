-- Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  store_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ecommerce' CHECK (category IN (
    'fashion', 'beauty', 'health', 'electronics', 'home', 'food',
    'sports', 'toys', 'automotive', 'jewelry', 'pets', 'ecommerce', 'other'
  )),
  store_scrape_data JSONB DEFAULT NULL,
  brand_dna JSONB DEFAULT NULL,
  brand_dna_version INTEGER DEFAULT 0,
  creative_intelligence_report JSONB DEFAULT NULL,
  ad_concepts JSONB DEFAULT NULL,
  pipeline_status TEXT NOT NULL DEFAULT 'stage_1' CHECK (pipeline_status IN (
    'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5',
    'stage_6', 'stage_7', 'stage_8', 'stage_9', 'complete'
  )),
  current_stage_status TEXT NOT NULL DEFAULT 'not_started' CHECK (current_stage_status IN (
    'not_started', 'processing', 'review', 'approved', 'failed', 'invalidated'
  )),
  notes TEXT DEFAULT '',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate slug from brand_name
CREATE OR REPLACE FUNCTION public.generate_brand_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(TRIM(NEW.brand_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  new_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.brands WHERE slug = new_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_brand_insert_slug
  BEFORE INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.generate_brand_slug();
