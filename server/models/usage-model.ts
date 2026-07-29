import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type UsageDailyRow = Database["public"]["Tables"]["usage_daily"]["Row"];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsageToday(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UsageDailyRow | null> {
  const { data, error } = await supabase
    .from("usage_daily")
    .select("*")
    .eq("user_id", userId)
    .eq("day", todayUtc())
    .maybeSingle();
  if (error) throw error;
  return data;
}
