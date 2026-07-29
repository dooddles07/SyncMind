import { NextResponse } from "next/server";
import { deleteMeeting, finalizeUpload } from "@/server/controllers/meeting-controller";
import { createClient } from "@/server/config/supabase-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Only the upload-finalize transition exists so far -- rename/pin (documented in
  // docs/ARCHITECTURE.md section 5) are later work, not built yet.
  if (body.status !== "transcribing") {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Unsupported update." } },
      { status: 400 },
    );
  }

  await finalizeUpload(supabase, id);
  return NextResponse.json({ status: "transcribing" });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  // RLS's "own rows" policy on meetings scopes this delete to the caller's own
  // meeting -- an id belonging to someone else (or a nonexistent one) deletes
  // zero rows, not an error, so this never leaks whether a meeting exists.
  await deleteMeeting(supabase, id);
  return NextResponse.json({ deleted: true });
}
