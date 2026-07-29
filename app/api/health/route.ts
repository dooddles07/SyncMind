import { NextResponse } from "next/server";
import { getHealth } from "@/server/controllers/health-controller";

export async function GET() {
  return NextResponse.json(getHealth());
}
