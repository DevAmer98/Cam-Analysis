import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: { username: session.username, role: session.role }
  });
}
