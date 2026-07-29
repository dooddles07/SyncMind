import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { currentStatus } from "@/server/controllers/pipeline-controller";
import { HttpError } from "@/server/utils/http-error";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await currentStatus(supabase, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "not_found", message: err.message } }, { status: err.status });
    }
    throw err;
  }
}
