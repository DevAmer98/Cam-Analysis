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
  const cameraId = url.searchParams.get("cameraId");
  const channelNo = url.searchParams.get("channelNo");
  const hours = Number(url.searchParams.get("hours") ?? "24");
  const day = url.searchParams.get("day");
  const dayParam = day ? day.trim() : "";
  const bucketParam = url.searchParams.get("bucket") ?? "";
  const fromParam = url.searchParams.get("from")?.trim() ?? "";
  const toParam = url.searchParams.get("to")?.trim() ?? "";

  if (!cameraId || !channelNo) {
    return NextResponse.json(
      { ok: false, error: "Missing cameraId or channelNo." },
      { status: 400 }
    );
  }

  const channelNum = Number(channelNo);
  if (!Number.isFinite(channelNum)) {
    return NextResponse.json(
      { ok: false, error: "Invalid channelNo." },
      { status: 400 }
    );
  }

  const rangeHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24;
  const db = getDbPool();

  const bucket =
    bucketParam === "minute" || bucketParam === "day" || bucketParam === "hour"
      ? bucketParam
      : "hour";

  if (fromParam && toParam) {
    const start = new Date(`${fromParam}T00:00:00.000Z`);
    const end = new Date(`${toParam}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid from/to range." }, { status: 400 });
    }
    if (end.getTime() < start.getTime()) {
      return NextResponse.json({ ok: false, error: "Invalid date range." }, { status: 400 });
    }
    const maxDays = bucket === "minute" ? 2 : bucket === "day" ? 365 : 31;
    const dayMs = 24 * 60 * 60 * 1000;
    const safeEnd = new Date(
      Math.min(end.getTime(), start.getTime() + (maxDays - 1) * dayMs)
    );
    const endExclusive = new Date(safeEnd.getTime() + dayMs);

    let rows: { bucket: Date | string | null; people_in: number; people_out: number }[] = [];
    if (bucket === "minute") {
      const result = await db.query(
        `select date_trunc('minute', event_time) as bucket,
                coalesce(sum(object_in), 0) as people_in,
                coalesce(sum(object_out), 0) as people_out
         from people_count_events
         where camera_id = $1
           and channel_no = $2
           and event_time >= $3
           and event_time < $4
         group by bucket
         order by bucket`,
        [cameraId, channelNum, start.toISOString(), endExclusive.toISOString()]
      );
      rows = result.rows;
    } else if (bucket === "day") {
      const result = await db.query(
        `select day as bucket,
                coalesce(sum(in_count), 0) as people_in,
                coalesce(sum(out_count), 0) as people_out
         from counting_stats_daily
         where camera_id = $1
           and channel_no = $2
           and day >= $3::date
           and day <= $4::date
         group by bucket
         order by bucket`,
        [cameraId, channelNum, fromParam, toParam]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `select bucket_start as bucket,
                coalesce(sum(in_count), 0) as people_in,
                coalesce(sum(out_count), 0) as people_out
         from counting_stats_hourly
         where camera_id = $1
           and channel_no = $2
           and bucket_start >= $3
           and bucket_start < $4
         group by bucket
         order by bucket`,
        [cameraId, channelNum, start.toISOString(), endExclusive.toISOString()]
      );
      rows = result.rows;
    }

    const series: SeriesPoint[] = rows
      .map((row) => {
        const bucketValue = row.bucket ? new Date(row.bucket).toISOString() : null;
        if (!bucketValue) return null;
        return {
          t: bucketValue,
          peopleIn: Number(row.people_in ?? 0),
          peopleOut: Number(row.people_out ?? 0),
          faces: 0
        } satisfies SeriesPoint;
      })
      .filter((row): row is SeriesPoint => row !== null);

    return NextResponse.json({ ok: true, series });
  }

  const peopleWhere = dayParam
    ? "camera_id = $1 and channel_no = $2 and bucket_start >= $3::date + interval '1 day' - ($4::int * interval '1 hour') and bucket_start < $3::date + interval '1 day'"
    : "camera_id = $1 and channel_no = $2 and bucket_start >= now() - ($3::int * interval '1 hour')";
  const peopleParams = dayParam
    ? [cameraId, channelNum, dayParam, rangeHours]
    : [cameraId, channelNum, rangeHours];

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

  const series: SeriesPoint[] = peopleRows.rows
    .map((row) => {
      const bucket = row.bucket ? new Date(row.bucket).toISOString() : null;
      if (!bucket) return null;
      return {
        t: bucket,
        peopleIn: Number(row.people_in ?? 0),
        peopleOut: Number(row.people_out ?? 0),
        faces: 0
      } satisfies SeriesPoint;
    })
    .filter((row): row is SeriesPoint => row !== null);

  return NextResponse.json({ ok: true, series });
}
