// Generic validate/repair loop, docs/AI-PIPELINE.md section 5 steps 1-4 and 6.
// Step 5 (switch to the Gemini fallback model) is deliberately not implemented yet
// -- no Gemini client exists, and the repair-retry step already covers the common
// failure (near-valid JSON needing one correction). Flagged, not hidden.
import type { z } from "zod";
import { runStructuredCompletion } from "@/server/config/groq";

export class StructuredOutputError extends Error {}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function runStructuredAndValidate<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  options: { temperature: number; model?: string },
): Promise<{ result: T; totalTokens: number }> {
  const first = await runStructuredCompletion(systemPrompt, userPrompt, options);
  let totalTokens = first.usage.totalTokens;

  const attempt = (raw: string) => schema.safeParse(JSON.parse(stripFences(raw)));

  let parsed;
  try {
    parsed = attempt(first.content);
  } catch {
    parsed = { success: false as const, error: { issues: [{ message: "Response was not valid JSON." }] } };
  }
  if (parsed.success) return { result: parsed.data, totalTokens };

  const issues = parsed.error.issues.map((i) => i.message).join("; ");
  const repairPrompt = `${userPrompt}\n\nYour previous output failed validation with these errors: ${issues}. Return corrected JSON only.`;
  const repaired = await runStructuredCompletion(systemPrompt, repairPrompt, options);
  totalTokens += repaired.usage.totalTokens;

  let repairedParsed;
  try {
    repairedParsed = attempt(repaired.content);
  } catch {
    repairedParsed = {
      success: false as const,
      error: { issues: [{ message: "Repaired response was not valid JSON." }] },
    };
  }
  if (repairedParsed.success) return { result: repairedParsed.data, totalTokens };

  throw new StructuredOutputError(
    `Model output failed validation twice: ${repairedParsed.error.issues.map((i) => i.message).join("; ")}`,
  );
}
