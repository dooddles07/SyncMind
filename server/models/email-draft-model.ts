import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type EmailDraftRow = Database["public"]["Tables"]["email_drafts"]["Row"];
export type EmailDraftInsert = Database["public"]["Tables"]["email_drafts"]["Insert"];

export async function getEmailDraftForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<EmailDraftRow | null> {
  const { data, error } = await supabase
    .from("email_drafts")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertEmailDraft(
  supabase: SupabaseClient<Database>,
  draft: EmailDraftInsert,
): Promise<void> {
  const { error } = await supabase.from("email_drafts").upsert(draft, { onConflict: "meeting_id" });
  if (error) throw error;
}
