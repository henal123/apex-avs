import { z } from "zod";

export const runStageSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const approveStageSchema = z.object({
  feedback: z.string().max(2000).optional().default(""),
});

export const rejectStageSchema = z.object({
  feedback: z.string().min(1, "Feedback is required when rejecting").max(2000),
});

export const unlockStageSchema = z.object({
  confirm: z.literal(true, { message: "Must confirm unlock" }),
});

export type RunStageInput = z.infer<typeof runStageSchema>;
export type ApproveStageInput = z.infer<typeof approveStageSchema>;
export type RejectStageInput = z.infer<typeof rejectStageSchema>;
export type UnlockStageInput = z.infer<typeof unlockStageSchema>;
