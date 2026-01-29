import { NextResponse } from "next/server";
import { getDbPool } from "../../../../../lib/db";
import { getSessionFromRequest } from "../../../../../lib/auth";
import { resetPeopleCount } from "../../../../../lib/cameraStore";

type ResetPayload = {
  ip?: string;
  channelId?: string;
};

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const payload = (await req.json().catch(() => ({}))) as ResetPayload;
  const ip = typeof payload.ip === "string" ? payload.ip.trim() : "";
  const channelId = typeof payload.channelId === "string" ? payload.channelId.trim() : "";

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

  await db.query(
    `delete from counting_stats_daily
     where camera_id = $1 and channel_no = $2`,
    [cameraId, Number(channelId)]
  );
  await db.query(
    `delete from counting_stats_hourly
     where camera_id = $1 and channel_no = $2`,
    [cameraId, Number(channelId)]
  );
  resetPeopleCount(ip, channelId);

  return NextResponse.json({ ok: true });
}
