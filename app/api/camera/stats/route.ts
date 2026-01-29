import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ip = url.searchParams.get("ip");
  const day = url.searchParams.get("day");
  const dayParam = day ? day.trim() : "";
  if (!ip) {
    return NextResponse.json({ ok: false, error: "Missing ip." }, { status: 400 });
  }
  const db = getDbPool();
  const cameraResult = await db.query("select id from cameras where ip = $1", [ip]);
  const cameraId = cameraResult.rows[0]?.id as string | undefined;
  if (!cameraId) {
    return NextResponse.json({
      ok: true,
      stats: { ip, lastEventAt: null, channels: [] }
    });
  }

  const peopleWhere = dayParam
    ? "camera_id = $1 and day = $2::date"
    : "camera_id = $1 and day >= current_date";
  const peopleParams = dayParam ? [cameraId, dayParam] : [cameraId];
  const peopleRows = await db.query(
    `select channel_no,
            coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out,
            max(day) as last_people_event
     from counting_stats_daily
     where ${peopleWhere}
     group by channel_no`,
    peopleParams
  );

  const faceWhere = dayParam
    ? "camera_id = $1 and bucket_start >= $2::date and bucket_start < $2::date + interval '1 day'"
    : "camera_id = $1";
  const faceParams = dayParam ? [cameraId, dayParam] : [cameraId];
  const faceRows = await db.query(
    `select channel_no,
            max(bucket_start) as last_face_event
     from face_stats_hourly
     where ${faceWhere}
     group by channel_no`,
    faceParams
  );

  const attributeWhere = dayParam
    ? "camera_id = $1 and day = $2::date"
    : "camera_id = $1 and day >= current_date";
  const attributeParams = dayParam ? [cameraId, dayParam] : [cameraId];
  const attributeRows = await db.query(
    `select channel_no,
            coalesce(sum(total), 0) as faces_total,
            coalesce(sum(male), 0) as male_count,
            coalesce(sum(female), 0) as female_count,
            coalesce(sum(unknown_gender), 0) as gender_unknown,
            coalesce(sum(glasses_yes), 0) as glasses_yes,
            coalesce(sum(glasses_no), 0) as glasses_no,
            coalesce(sum(glasses_unknown), 0) as glasses_unknown,
            coalesce(sum(age_child), 0) as child_count,
            coalesce(sum(age_teen), 0) as teen_count,
            coalesce(sum(age_young_adult), 0) as young_count,
            coalesce(sum(age_middle_age), 0) as middle_count,
            coalesce(sum(age_senior), 0) as senior_count,
            coalesce(sum(age_unknown), 0) as age_unknown_count
     from face_stats_daily
     where ${attributeWhere}
     group by channel_no`,
    attributeParams
  );

  const channelMap = new Map<
    number,
    {
      peopleIn: number;
      peopleOut: number;
      faceEvents: number;
      facesDetected: number;
      gender: { male: number; female: number; unknown: number };
      age: { avg: number | null };
      glasses: { yes: number; no: number; unknown: number };
      lastEventAt: string | null;
    }
  >();

  for (const row of peopleRows.rows) {
    const channelNo = Number(row.channel_no);
    channelMap.set(channelNo, {
      peopleIn: Number(row.people_in ?? 0),
      peopleOut: Number(row.people_out ?? 0),
      faceEvents: 0,
      facesDetected: 0,
      gender: { male: 0, female: 0, unknown: 0 },
      age: { avg: null },
      glasses: { yes: 0, no: 0, unknown: 0 },
      lastEventAt: row.last_people_event ? new Date(row.last_people_event).toISOString() : null
    });
  }

  for (const row of faceRows.rows) {
    const channelNo = Number(row.channel_no);
    const existing = channelMap.get(channelNo) ?? {
      peopleIn: 0,
      peopleOut: 0,
      faceEvents: 0,
      facesDetected: 0,
      gender: { male: 0, female: 0, unknown: 0 },
      age: { avg: null },
      glasses: { yes: 0, no: 0, unknown: 0 },
      lastEventAt: null
    };
    const lastFace = row.last_face_event ? new Date(row.last_face_event).toISOString() : null;
    channelMap.set(channelNo, {
      peopleIn: existing.peopleIn,
      peopleOut: existing.peopleOut,
      faceEvents: existing.faceEvents,
      facesDetected: existing.facesDetected,
      gender: existing.gender,
      age: existing.age,
      glasses: existing.glasses,
      lastEventAt: existing.lastEventAt || lastFace
    });
  }

  for (const row of attributeRows.rows) {
    const channelNo = Number(row.channel_no);
    const existing = channelMap.get(channelNo) ?? {
      peopleIn: 0,
      peopleOut: 0,
      faceEvents: 0,
      facesDetected: 0,
      gender: { male: 0, female: 0, unknown: 0 },
      age: { avg: null },
      glasses: { yes: 0, no: 0, unknown: 0 },
      lastEventAt: null
    };
    const child = Number(row.child_count ?? 0);
    const teen = Number(row.teen_count ?? 0);
    const young = Number(row.young_count ?? 0);
    const middle = Number(row.middle_count ?? 0);
    const senior = Number(row.senior_count ?? 0);
    const knownAges = child + teen + young + middle + senior;
    const avgAge =
      knownAges > 0
        ? (child * 6 + teen * 16 + young * 30 + middle * 50 + senior * 70) / knownAges
        : null;
    const facesTotal = Number(row.faces_total ?? 0);
    channelMap.set(channelNo, {
      ...existing,
      faceEvents: facesTotal,
      facesDetected: facesTotal,
      gender: {
        male: Number(row.male_count ?? 0),
        female: Number(row.female_count ?? 0),
        unknown: Number(row.gender_unknown ?? 0)
      },
      age: { avg: avgAge },
      glasses: {
        yes: Number(row.glasses_yes ?? 0),
        no: Number(row.glasses_no ?? 0),
        unknown: Number(row.glasses_unknown ?? 0)
      }
    });
  }

  return NextResponse.json({
    ok: true,
    stats: {
      ip,
      lastEventAt: null,
      channels: Array.from(channelMap.entries()).map(([channelId, stats]) => ({
        channelId: String(channelId),
        stats
      }))
    }
  });
}
