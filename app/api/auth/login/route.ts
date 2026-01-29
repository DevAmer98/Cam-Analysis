import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";
import {
  createSession,
  getSessionCookieName,
  getSessionTtlSeconds,
  verifyPassword
} from "../../../../lib/auth";

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) as LoginPayload;
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Missing credentials." }, { status: 400 });
  }

  const db = getDbPool();
  const result = await db.query(
    "select username, password_hash, role from users where username = $1",
    [username]
  );
  const user = result.rows[0] as
    | { username: string; password_hash: string; role: "admin" | "user" }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const { token } = createSession(user.username, user.role);
  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, role: user.role }
  });
  res.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds()
  });
  return res;
}
