// Real share-link creation (docs/ARCHITECTURE.md section 5, docs/DATA-MODEL.md
// "share_links"). Nothing here is a new design decision.
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";
import { insertShareLink } from "@/server/models/share-link-model";
import type { MeetingRow } from "@/server/models/meeting-model";

export interface CreatedShareLink {
  token: string;
  url: string;
}

export async function createShareLink(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
  includeTranscript: boolean,
): Promise<CreatedShareLink> {
  const token = randomBytes(32).toString("base64url");

  await insertShareLink(supabase, {
    token,
    meeting_id: meeting.id,
    user_id: meeting.user_id,
    include_transcript: includeTranscript,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { token, url: `${baseUrl}/share/${token}` };
}
