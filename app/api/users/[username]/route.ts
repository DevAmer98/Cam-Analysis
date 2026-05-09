import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";
import { getSessionFromRequest, hashPassword } from "../../../../lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { username: string } }
) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    passwordHash?: string;
    role?: string;
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (typeof body.passwordHash === "string" && body.passwordHash) {
    setClauses.push(`password_hash = $${values.length + 1}`);
    values.push(hashPassword(body.passwordHash));
  }
  if (body.role === "admin" || body.role === "user") {
    setClauses.push(`role = $${values.length + 1}`);
    values.push(body.role);
  }

  if (!setClauses.length) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  values.push(params.username);
  const db = getDbPool();
  const result = await db.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE username = $${values.length}`,
    values
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { username: string } }
) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (params.username === session.username) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete your own account." },
      { status: 400 }
    );
  }

  // Prevent deleting the last admin
  const db = getDbPool();
  if (params.username !== session.username) {
    const check = await db.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
    );
    const adminCount = Number(check.rows[0]?.cnt ?? 0);
    const targetResult = await db.query(
      "SELECT role FROM users WHERE username = $1",
      [params.username]
    );
    const targetRole = targetResult.rows[0]?.role;
    if (targetRole === "admin" && adminCount <= 1) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete the last admin account." },
        { status: 400 }
      );
    }
  }

  const result = await db.query("DELETE FROM users WHERE username = $1", [params.username]);
  if (result.rowCount === 0) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
