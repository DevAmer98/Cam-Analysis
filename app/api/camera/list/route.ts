import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

type CameraColumns = {
  deviceType: boolean;
  zone: boolean;
  updatedAt: boolean;
  parentCameraId: boolean;
};

async function getCameraColumns() {
  const db = getDbPool();
  const result = await db.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = 'cameras'`
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  return {
    deviceType: columns.has("device_type"),
    zone: columns.has("zone"),
    updatedAt: columns.has("updated_at"),
    parentCameraId: columns.has("parent_camera_id")
  } satisfies CameraColumns;
}

export async function GET() {
  const db = getDbPool();
  const columns = await getCameraColumns();
  const deviceTypeSelect = columns.deviceType ? "c.device_type" : "null::text as device_type";
  const zoneSelect = columns.zone ? "c.zone" : "null::text as zone";
  const updatedAtSelect = columns.updatedAt
    ? "c.updated_at"
    : "null::timestamptz as updated_at";
  const parentCameraSelect = columns.parentCameraId
    ? "c.parent_camera_id"
    : "null::uuid as parent_camera_id";

  const result = await db.query(
    `select c.id,
            c.ip,
            c.name,
            ${deviceTypeSelect},
            ${zoneSelect},
            ${updatedAtSelect},
            ${parentCameraSelect},
            count(ch.id) as channels_total
     from cameras c
     left join channels ch on ch.camera_id = c.id
     group by c.id
     order by coalesce(c.updated_at, c.created_at) desc`
  );

  return NextResponse.json({
    ok: true,
    cameras: result.rows.map((row) => ({
      id: row.id as string,
      ip: row.ip as string,
      name: row.name as string | null,
      deviceType: row.device_type as string | null,
      zone: row.zone as string | null,
      channelsTotal: Number(row.channels_total ?? 0),
      parentCameraId: (row.parent_camera_id as string | null) ?? null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    }))
  });
}
