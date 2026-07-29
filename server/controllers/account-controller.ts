// Real "Delete all my data" (docs/SECURITY-PRIVACY.md section 4: "deletes every
// meeting and the auth.users row, which cascades the profile"). Every child table
// already references profiles(id) on delete cascade, and profiles.id references
// auth.users(id) on delete cascade (supabase/migrations/
// 20260729004529_profiles_and_trigger.sql) -- deleting the auth user cascades
// everything in Postgres on its own. Storage isn't reached by that cascade, so
// it's the one thing this function has to clean up manually, first.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";
import { getAllStoragePathsForUser } from "@/server/models/audio-chunk-model";

export async function deleteAllUserData(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  const paths = await getAllStoragePathsForUser(supabase, userId);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("recordings").remove(paths);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}
