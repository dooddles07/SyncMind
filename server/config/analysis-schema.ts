// Verbatim from docs/AI-PIPELINE.md section 3 -- the shape Groq's structured output
// must match. Nothing here is a new design decision.
import { z } from "zod";

export const AnalysisSchema = z.object({
  overview: z.string().min(40).max(1500),
  attendees: z.array(
    z.object({
      speakerLabel: z.string(),
      name: z.string().nullable(),
      confidence: z.enum(["stated", "inferred"]),
    }),
  ),
  topics: z
    .array(
      z.object({
        title: z.string().max(120),
        points: z.array(z.string()).min(1).max(8),
        atSec: z.number().nonnegative(),
      }),
    )
    .max(12),
  decisions: z
    .array(
      z.object({
        text: z.string().max(400),
        atSec: z.number().nonnegative(),
      }),
    )
    .max(20),
  openQuestions: z
    .array(
      z.object({
        text: z.string().max(400),
        atSec: z.number().nonnegative(),
      }),
    )
    .max(15),
  actionItems: z
    .array(
      z.object({
        title: z.string().max(200),
        detail: z.string().max(600).nullable(),
        owner: z.string().max(80).nullable(),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
        priority: z.enum(["low", "medium", "high"]),
        atSec: z.number().nonnegative(),
      }),
    )
    .max(40),
  speakerRanges: z
    .array(
      z.object({
        fromSec: z.number().nonnegative(),
        toSec: z.number().nonnegative(),
        speakerLabel: z.string(),
      }),
    )
    .optional(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
