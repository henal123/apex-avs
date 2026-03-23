import { z } from "zod";

export const imageModelEnum = z.enum(["nano-banana-pro", "flux-pro"]);

export const regenerateVariantSchema = z.object({
  prompt_text: z.string().min(10).max(5000).optional(),
  model: imageModelEnum.optional(),
  seed: z.number().int().optional(),
});

export const compositingSpecSchema = z.object({
  text_overlays: z.array(z.object({
    id: z.string(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    fontFamily: z.string(),
    fontSize: z.number(),
    fontWeight: z.string(),
    fill: z.string(),
    textAlign: z.string(),
    textCase: z.enum(["none", "uppercase", "lowercase", "capitalize"]),
    shadow: z.object({
      enabled: z.boolean(),
      color: z.string(),
      offsetX: z.number(),
      offsetY: z.number(),
      blur: z.number(),
    }),
    background: z.object({
      enabled: z.boolean(),
      color: z.string(),
      opacity: z.number(),
      padding: z.number(),
      borderRadius: z.number(),
    }),
  })),
  logo_overlay: z.object({
    image_url: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    opacity: z.number(),
  }).nullable(),
  canvas_width: z.number().int().positive(),
  canvas_height: z.number().int().positive(),
});

export const createGallerySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  selected_ad_ids: z.array(z.string().uuid()).min(1),
  is_password_protected: z.boolean().optional().default(false),
  password: z.string().min(4).optional(),
  expires_at: z.string().datetime().optional(),
});

export type RegenerateVariantInput = z.infer<typeof regenerateVariantSchema>;
export type CompositingSpecInput = z.infer<typeof compositingSpecSchema>;
export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
