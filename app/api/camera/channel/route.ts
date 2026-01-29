import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";

type ChannelUpdatePayload = {
  ip?: string;
  channelId?: string;
  name?: string | null;
  zone?: string | null;
};

export async function PATCH(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const payload = (await req.json().catch(() => ({}))) as ChannelUpdatePayload;
  const ip = typeof payload.ip === "string" ? payload.ip.trim() : "";
  const channelId = typeof payload.channelId === "string" ? payload.channelId.trim() : "";
  const hasName = Object.prototype.hasOwnProperty.call(payload, "name");
  const hasZone = Object.prototype.hasOwnProperty.call(payload, "zone");
  const rawName =
    typeof payload.name === "string" ? payload.name.trim() : payload.name ?? "";
  const rawZone =
    typeof payload.zone === "string" ? payload.zone.trim() : payload.zone ?? "";

  if (!ip || !channelId) {
    return NextResponse.json(
      { ok: false, error: "Missing ip or channelId." },
      { status: 400 }
    );
  }

  const db = getDbPool();
  const cameraResult = await db.query("select id from cameras where ip = $1", [ip]);
  const cameraId = cameraResult.rows[0]?.id as string | undefined;
  if (!cameraId) {
    return NextResponse.json({ ok: false, error: "Camera not found." }, { status: 404 });
  }

  if (!hasName && !hasZone) {
    return NextResponse.json(
      { ok: false, error: "Missing name or zone." },
      { status: 400 }
    );
  }

  const updates: string[] = [];
  const values: Array<string | null> = [];
  if (hasName) {
    const nameValue = rawName.length ? rawName : null;
    updates.push(`name = $${values.length + 1}`);
    values.push(nameValue);
  }
  if (hasZone) {
    const zoneValue = rawZone.length ? rawZone : null;
    updates.push(`zone = $${values.length + 1}`);
    values.push(zoneValue);
  }
  updates.push("updated_at = now()");
  values.push(cameraId, String(Number(channelId)));

  const updateResult = await db.query(
    `update channels
     set ${updates.join(", ")}
     where camera_id = $${values.length - 1} and channel_no = $${values.length}
     returning name, zone`,
    values
  );

  if (updateResult.rowCount === 0) {
    return NextResponse.json({ ok: false, error: "Channel not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    name: updateResult.rows[0]?.name ?? null,
    zone: updateResult.rows[0]?.zone ?? null
  });
}
