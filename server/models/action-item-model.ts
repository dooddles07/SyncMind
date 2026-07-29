import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type ActionItemRow = Database["public"]["Tables"]["action_items"]["Row"] & {
  meetings: { title: string } | null;
};

/** No meetingId = every action item across all the caller's meetings, for the
 *  cross-meeting board at /tasks. RLS already scopes this to the caller. Joins the
 *  meeting title via the FK -- the UI needs it displayed alongside every to-do. */
export async function getActionItems(
  supabase: SupabaseClient<Database>,
  meetingId?: string,
): Promise<ActionItemRow[]> {
  let query = supabase
    .from("action_items")
    .select("*, meetings(title)")
    .order("position", { ascending: true });
  if (meetingId) query = query.eq("meeting_id", meetingId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
