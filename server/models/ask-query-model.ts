import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type AskQueryRow = Database["public"]["Tables"]["ask_queries"]["Row"];

export async function getAskQueriesForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<AskQueryRow[]> {
  const { data, error } = await supabase
    .from("ask_queries")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}
