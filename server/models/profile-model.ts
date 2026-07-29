import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateRetentionDays(
  supabase: SupabaseClient<Database>,
  userId: string,
  days: number,
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ retention_days: days }).eq("id", userId);
  if (error) throw error;
}
