import { z } from "zod";

export const brandCategoryEnum = z.enum([
  "fashion", "beauty", "health", "electronics", "home", "food",
  "sports", "toys", "automotive", "jewelry", "pets", "ecommerce", "other",
]);

export const createBrandSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required").max(100),
  store_url: z.string().url("Must be a valid URL"),
  category: brandCategoryEnum,
});

export const updateBrandSchema = z.object({
  brand_name: z.string().min(1).max(100).optional(),
  store_url: z.string().url().optional(),
  category: brandCategoryEnum.optional(),
  notes: z.string().max(5000).optional(),
  brand_dna: z.record(z.string(), z.unknown()).optional(),
  creative_intelligence_report: z.record(z.string(), z.unknown()).optional(),
  ad_concepts: z.array(z.record(z.string(), z.unknown())).optional(),
  store_scrape_data: z.record(z.string(), z.unknown()).optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
