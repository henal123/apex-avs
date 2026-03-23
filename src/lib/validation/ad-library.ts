import { z } from "zod";

export const sourceTypeEnum = z.enum(["brand_own", "competitor", "adjacent_category"]);
export const performanceTierEnum = z.enum(["winner", "performer", "testing", "unknown"]);
export const adFlagEnum = z.enum(["reference", "ignore"]).nullable();

export const updateAdSchema = z.object({
  source_type: sourceTypeEnum.optional(),
  source_name: z.string().max(200).optional(),
  performance_tier: performanceTierEnum.optional(),
  flag: adFlagEnum.optional(),
  days_running: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  user_tags: z.array(z.string()).optional(),
  ad_copy: z.object({
    primary_text: z.string().optional(),
    headline: z.string().optional(),
    description: z.string().optional(),
    cta: z.string().optional(),
  }).optional(),
  analysis: z.record(z.string(), z.unknown()).optional(),
});

export const bulkAdActionSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1),
  action: z.enum(["tag", "flag", "delete", "reanalyze"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type BulkAdActionInput = z.infer<typeof bulkAdActionSchema>;
