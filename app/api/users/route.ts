import { NextResponse } from "next/server";
import { getDbPool } from "../../../lib/db";
import { getSessionFromRequest, hashPassword } from "../../../lib/auth";

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const db = getDbPool();
  const result = await db.query(
    "SELECT username, role, created_at FROM users ORDER BY created_at ASC"
  );
  return NextResponse.json({ ok: true, users: result.rows });
}

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    passwordHash?: string;
    role?: string;
  };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const passwordHash = typeof body.passwordHash === "string" ? body.passwordHash : "";
  const role = body.role;

  if (!username || !passwordHash || (role !== "admin" && role !== "user")) {
    return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  }

  const stored = hashPassword(passwordHash);
  const db = getDbPool();
  try {
    await db.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
      [username, stored, role]
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: false, error: "Username already exists." }, { status: 409 });
    }
    console.error("Create user error:", err);
    return NextResponse.json({ ok: false, error: "Database error." }, { status: 500 });
  }
}
