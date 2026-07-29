import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type ShareLinkRow = Database["public"]["Tables"]["share_links"]["Row"];
export type ShareLinkInsert = Database["public"]["Tables"]["share_links"]["Insert"];

/** Session-scoped -- RLS already limits this to the caller's own links, so an
 *  active link belonging to someone else is structurally unreachable here. */
export async function getActiveShareLinkForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<ShareLinkRow | null> {
  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("meeting_id", meetingId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertShareLink(
  supabase: SupabaseClient<Database>,
  link: ShareLinkInsert,
): Promise<ShareLinkRow> {
  const { data, error } = await supabase.from("share_links").insert(link).select().single();
  if (error) throw error;
  return data;
}

/** Sets revoked_at rather than deleting the row -- docs/SECURITY-PRIVACY.md section
 *  4 describes revocation as "revoked_at is checked on every request", an audit
 *  trail of when a link was live and how many views it got, not a hard delete.
 *  Session-scoped: RLS's "own rows" policy on share_links means this is a safe
 *  no-op against a token that isn't the caller's, not a check this function needs
 *  to perform itself. */
export async function revokeShareLink(supabase: SupabaseClient<Database>, token: string): Promise<void> {
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw error;
}

/** Admin-client only (docs/DATA-MODEL.md section 4): the public share page has no
 *  caller session to scope RLS by, so this deliberately bypasses RLS and does its
 *  own explicit revoked/expiry check instead. Never call with a session-scoped
 *  client -- that would defeat the point of the RLS bypass being narrow. */
export async function getShareLinkByToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<ShareLinkRow | null> {
  const { data, error } = await supabase.from("share_links").select("*").eq("token", token).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.revoked_at !== null) return null;
  if (data.expires_at !== null && new Date(data.expires_at) <= new Date()) return null;
  return data;
}

export async function incrementShareLinkViewCount(
  supabase: SupabaseClient<Database>,
  token: string,
  currentViewCount: number,
): Promise<void> {
  const { error } = await supabase
    .from("share_links")
    .update({ view_count: currentViewCount + 1 })
    .eq("token", token);
  if (error) throw error;
}
