import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type SummaryRow = Database["public"]["Tables"]["summaries"]["Row"];

export async function getSummaryForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<SummaryRow | null> {
  const { data, error } = await supabase
    .from("summaries")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
