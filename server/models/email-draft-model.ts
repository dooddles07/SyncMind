import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type EmailDraftRow = Database["public"]["Tables"]["email_drafts"]["Row"];

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
