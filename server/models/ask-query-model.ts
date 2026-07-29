import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type AskQueryRow = Database["public"]["Tables"]["ask_queries"]["Row"];
export type AskQueryInsert = Database["public"]["Tables"]["ask_queries"]["Insert"];

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

/** The 20-questions-per-meeting-per-day cap (docs/AI-PIPELINE.md section 6) is a
 *  product-level anti-abuse limit, independent of lib/quota.ts's Groq-cost gate --
 *  counted straight from today's real rows, not a separate tracked counter. */
export async function countAskQueriesToday(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<number> {
  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  const { count, error } = await supabase
    .from("ask_queries")
    .select("*", { count: "exact", head: true })
    .eq("meeting_id", meetingId)
    .gte("created_at", todayStart);
  if (error) throw error;
  return count ?? 0;
}

export async function insertAskQuery(
  supabase: SupabaseClient<Database>,
  query: AskQueryInsert,
): Promise<AskQueryRow> {
  const { data, error } = await supabase.from("ask_queries").insert(query).select().single();
  if (error) throw error;
  return data;
}
