// Verbatim from docs/AI-PIPELINE.md section 6 -- the shape Groq's structured output
// must match for a single "ask this meeting" answer.
import { z } from "zod";

export const AskSchema = z.object({
  answer: z.string().min(1).max(2000),
  citations: z.array(z.object({ atSec: z.number().nonnegative() })),
});

export type AskAnswer = z.infer<typeof AskSchema>;
