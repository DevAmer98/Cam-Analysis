import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

type SeriesPoint = {
  t: string;
  peopleIn: number;
  peopleOut: number;
  faces: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ip = url.searchParams.get("ip");
  const hours = Number(url.searchParams.get("hours") ?? "24");
  const day = url.searchParams.get("day");
  const dayParam = day ? day.trim() : "";
  if (!ip) {
    return NextResponse.json({ ok: false, error: "Missing ip." }, { status: 400 });
  }

  const db = getDbPool();
  const cameraResult = await db.query("select id from cameras where ip = $1", [ip]);
  const cameraId = cameraResult.rows[0]?.id as string | undefined;
  if (!cameraId) {
    return NextResponse.json({ ok: true, series: [] });
  }

  const rangeHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24;
  const peopleWhere = dayParam
    ? "camera_id = $1 and bucket_start >= $2::date + interval '1 day' - ($3::int * interval '1 hour') and bucket_start < $2::date + interval '1 day'"
    : "camera_id = $1 and bucket_start >= now() - ($2::int * interval '1 hour')";
  const peopleParams = dayParam ? [cameraId, dayParam, rangeHours] : [cameraId, rangeHours];

  const peopleRows = await db.query(
    `select bucket_start as bucket,
            coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out
     from counting_stats_hourly
     where ${peopleWhere}
     group by bucket
     order by bucket`,
    peopleParams
  );

  const faceWhere = dayParam
    ? "camera_id = $1 and bucket_start >= $2::date + interval '1 day' - ($3::int * interval '1 hour') and bucket_start < $2::date + interval '1 day'"
    : "camera_id = $1 and bucket_start >= now() - ($2::int * interval '1 hour')";
  const faceParams = dayParam ? [cameraId, dayParam, rangeHours] : [cameraId, rangeHours];
  const faceRows = await db.query(
    `select bucket_start as bucket,
            coalesce(sum(total), 0) as faces
     from face_stats_hourly
     where ${faceWhere}
     group by bucket
     order by bucket`,
    faceParams
  );

  const bucketMap = new Map<string, SeriesPoint>();
  for (const row of peopleRows.rows) {
    const bucket = row.bucket ? new Date(row.bucket).toISOString() : null;
    if (!bucket) continue;
    bucketMap.set(bucket, {
      t: bucket,
      peopleIn: Number(row.people_in ?? 0),
      peopleOut: Number(row.people_out ?? 0),
      faces: 0
    });
  }

  for (const row of faceRows.rows) {
    const bucket = row.bucket ? new Date(row.bucket).toISOString() : null;
    if (!bucket) continue;
    const existing = bucketMap.get(bucket) ?? {
      t: bucket,
      peopleIn: 0,
      peopleOut: 0,
      faces: 0
    };
    existing.faces = Number(row.faces ?? 0);
    bucketMap.set(bucket, existing);
  }

  return NextResponse.json({
    ok: true,
    series: Array.from(bucketMap.values()).sort((a, b) => a.t.localeCompare(b.t))
  });
}
