import { z } from "zod";

export const startFocusSessionSchema = z.object({
  taskId: z.string().uuid().optional().nullable(),
  sessionType: z
    .enum(["FOCUS", "SHORT_BREAK", "LONG_BREAK"])
    .optional()
    .default("FOCUS"),
  plannedMinutes: z.number().int().min(1).max(180).optional().default(25),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const completeFocusSessionSchema = z.object({
  actualSeconds: z.number().int().min(0).max(86400),
  status: z.enum(["COMPLETED", "CANCELLED"]).optional().default("COMPLETED"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>;
export type CompleteFocusSessionInput = z.infer<typeof completeFocusSessionSchema>;
