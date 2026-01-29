import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

type CameraColumns = {
  deviceType: boolean;
  zone: boolean;
  updatedAt: boolean;
};

async function getCameraColumns() {
  const db = getDbPool();
  const result = await db.query<{ column_name: string }>(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = 'cameras'`
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  return {
    deviceType: columns.has("device_type"),
    zone: columns.has("zone"),
    updatedAt: columns.has("updated_at")
  } satisfies CameraColumns;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ip = url.searchParams.get("ip");
  if (!ip) {
    return NextResponse.json({ ok: false, error: "Missing ip." }, { status: 400 });
  }

  const db = getDbPool();
  const columns = await getCameraColumns();
  const deviceTypeSelect = columns.deviceType ? "device_type" : "null::text as device_type";
  const zoneSelect = columns.zone ? "zone" : "null::text as zone";
  const updatedAtSelect = columns.updatedAt ? "updated_at" : "null::timestamptz as updated_at";

  const cameraResult = await db.query(
    `select id, ip, name, ${deviceTypeSelect}, ${zoneSelect}, ${updatedAtSelect}
     from cameras where ip = $1`,
    [ip]
  );
  const camera = cameraResult.rows[0];
  if (!camera) {
    return NextResponse.json({ ok: false, error: "Camera not found." }, { status: 404 });
  }

  const channelsResult = await db.query(
    `select channel_no, name, zone, features, capabilities
     from channels
     where camera_id = $1
     order by channel_no asc`,
    [camera.id]
  );

  return NextResponse.json({
    ok: true,
    ip: camera.ip as string,
    name: camera.name as string | null,
    deviceType: camera.device_type as string | null,
    zone: camera.zone as string | null,
    updatedAt: camera.updated_at ? new Date(camera.updated_at).toISOString() : null,
    channels: channelsResult.rows.map((row) => ({
      id: String(row.channel_no),
      name:
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim()
          : `Channel ${row.channel_no}`,
      zone: row.zone as string | null,
      features: (row.features as string[]) ?? [],
      capabilities: row.capabilities ?? null
    }))
  });
}
