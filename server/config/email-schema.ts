// Verbatim from docs/AI-PIPELINE.md section 4 -- the shape Groq's structured
// output must match for the follow-up email draft.
import { z } from "zod";

export const EmailSchema = z.object({
  subject: z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1).max(4000),
});

export type EmailContent = z.infer<typeof EmailSchema>;
