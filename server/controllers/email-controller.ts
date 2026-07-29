// Real follow-up email draft (docs/AI-PIPELINE.md section 4). Reusable by both the
// automatic pipeline step (pipeline-controller.ts, using the sender's default tone)
// and the on-demand regenerate endpoint (a user-chosen tone). Nothing here is a new
// design decision -- prompt and schema are copied verbatim from the doc.
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndReserve, recordUsage } from "@/lib/quota";
import { EmailSchema } from "@/server/config/email-schema";
import { getActionItems } from "@/server/models/action-item-model";
import type { Database } from "@/server/models/database.types";
import { upsertEmailDraft } from "@/server/models/email-draft-model";
import type { MeetingRow } from "@/server/models/meeting-model";
import { getProfile } from "@/server/models/profile-model";
import { getSummaryForMeeting } from "@/server/models/summary-model";
import { HttpError } from "@/server/utils/http-error";
import { QuotaBlockedError } from "@/server/utils/pipeline-errors";
import { runStructuredAndValidate } from "@/server/utils/structured-output";

const CHARS_PER_TOKEN = 4;
const ESTIMATED_OUTPUT_TOKENS = 600;

export type EmailTone = Database["public"]["Enums"]["email_tone"];

const SYSTEM_PROMPT = `You write follow-up emails after meetings. Your emails are short, concrete, and
respectful of the reader's time.

RULES
1. Base the email only on the supplied minutes and action items. Add nothing.
2. Structure: one-sentence purpose, a short recap of what was decided, then the
   action items as a list with owner and date.
3. Do not use exclamation marks, corporate filler, or phrases like "I hope this
   email finds you well", "circle back", "touch base", "as per our discussion",
   "excited to", or "leverage".
4. Never state a deadline that is not in the supplied action items.
5. Use the sender's first name in the sign-off. Do not invent a job title or a
   company name.
6. Output ONLY JSON: { "subject": string, "bodyMarkdown": string }.

SCHEMA (Groq's JSON mode does not enforce this itself -- match these exact keys):
{ "subject": string, "bodyMarkdown": string }

TONE: {{tone}}
- professional: complete sentences, neutral register, suitable for a client.
- friendly: warmer and more conversational, still concise, suitable for internal
  colleagues.
- brief: under 120 words. Recap in one or two sentences, then the action list.`;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function formatDecisions(decisions: { text: string }[]): string {
  if (decisions.length === 0) return "None.";
  return decisions.map((d, i) => `${i + 1}. ${d.text}`).join("\n");
}

function formatActionItems(items: { title: string; owner_name: string | null; due_date: string | null }[]): string {
  if (items.length === 0) return "None.";
  return items
    .map((item) => `- ${item.title} — ${item.owner_name ?? "Unassigned"} — ${item.due_date ?? "No date"}`)
    .join("\n");
}

export async function draftEmail(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
  tone: EmailTone,
): Promise<void> {
  const [summary, actionItems, profile] = await Promise.all([
    getSummaryForMeeting(supabase, meeting.id),
    getActionItems(supabase, meeting.id),
    getProfile(supabase, meeting.user_id),
  ]);
  if (!summary) {
    throw new HttpError(400, "This meeting hasn't been analyzed yet.");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const systemPrompt = SYSTEM_PROMPT.replace("{{tone}}", tone);
  const decisions = summary.decisions as { text: string; atSec: number }[];

  const userPrompt = `SENDER_FIRST_NAME: ${firstName}
MEETING_TITLE: ${meeting.title}
MEETING_DATE: ${meeting.meeting_date}

SUMMARY:
${summary.overview}

DECISIONS:
${formatDecisions(decisions)}

ACTION ITEMS:
${formatActionItems(actionItems)}

Write the follow-up email.`;

  const projectedTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt) + ESTIMATED_OUTPUT_TOKENS;
  const quota = await checkAndReserve(supabase, meeting.user_id, { llmTokens: projectedTokens });
  if (!quota.ok) {
    throw new QuotaBlockedError(quota.resumeAt);
  }

  const { result, totalTokens } = await runStructuredAndValidate(EmailSchema, systemPrompt, userPrompt, {
    temperature: 0.4,
  });
  await recordUsage(supabase, { llmTokens: totalTokens });

  await upsertEmailDraft(supabase, {
    meeting_id: meeting.id,
    user_id: meeting.user_id,
    subject: result.subject,
    body_md: result.bodyMarkdown,
    tone,
  });
}
