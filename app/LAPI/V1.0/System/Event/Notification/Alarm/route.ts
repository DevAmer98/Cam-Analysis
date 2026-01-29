import { NextResponse } from "next/server";
import { safeJsonParse } from "../../../../../../../lib/unvUtils";

export async function POST(req: Request) {
  const raw = await req.text();
  safeJsonParse(raw);
  return NextResponse.json({ ResponseCode: 0 });
}
