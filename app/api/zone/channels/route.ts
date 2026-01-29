import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

type ChannelStats = {
  peopleIn: number;
  peopleOut: number;
  faceEvents: number;
  facesDetected: number;
  gender: { male: number; female: number; unknown: number };
  age: { avg: number | null };
  glasses: { yes: number; no: number; unknown: number };
  lastEventAt: string | null;
};

type AgeBuckets = {
  child: number;
  teen: number;
  youngAdult: number;
  middleAge: number;
  senior: number;
  unknown: number;
};

const emptyStats = (): ChannelStats => ({
  peopleIn: 0,
  peopleOut: 0,
  faceEvents: 0,
  facesDetected: 0,
  gender: { male: 0, female: 0, unknown: 0 },
  age: { avg: null },
  glasses: { yes: 0, no: 0, unknown: 0 },
  lastEventAt: null
});

const emptyAgeBuckets = (): AgeBuckets => ({
  child: 0,
  teen: 0,
  youngAdult: 0,
  middleAge: 0,
  senior: 0,
  unknown: 0
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const zone = url.searchParams.get("zone")?.trim();
  const day = url.searchParams.get("day");
  const dayParam = day ? day.trim() : "";
  if (!zone) {
    return NextResponse.json({ ok: false, error: "Missing zone." }, { status: 400 });
  }

  const db = getDbPool();
  const channelsResult = await db.query(
    `select c.id as camera_id,
            c.ip,
            c.name as camera_name,
            ch.channel_no,
            ch.name as channel_name,
            ch.zone,
            ch.features,
            ch.capabilities
     from channels ch
     join cameras c on c.id = ch.camera_id
     where ch.zone = $1
     order by coalesce(c.name, c.ip) asc, ch.channel_no asc`,
    [zone]
  );

  const peopleWhere = dayParam
    ? "ch.zone = $1 and p.day = $2::date"
    : "ch.zone = $1 and p.day >= current_date";
  const peopleParams = dayParam ? [zone, dayParam] : [zone];
  const peopleRows = await db.query(
    `select p.camera_id,
            p.channel_no,
            coalesce(sum(p.in_count), 0) as people_in,
            coalesce(sum(p.out_count), 0) as people_out,
            max(p.day) as last_people_event
     from counting_stats_daily p
     join channels ch
       on ch.camera_id = p.camera_id and ch.channel_no = p.channel_no
     where ${peopleWhere}
     group by p.camera_id, p.channel_no`,
    peopleParams
  );

  const faceWhere = dayParam
    ? "ch.zone = $1 and f.bucket_start >= $2::date and f.bucket_start < $2::date + interval '1 day'"
    : "ch.zone = $1";
  const faceParams = dayParam ? [zone, dayParam] : [zone];
  const faceRows = await db.query(
    `select f.camera_id,
            f.channel_no,
            max(f.bucket_start) as last_face_event
     from face_stats_hourly f
     join channels ch
       on ch.camera_id = f.camera_id and ch.channel_no = f.channel_no
     where ${faceWhere}
     group by f.camera_id, f.channel_no`,
    faceParams
  );

  const attributeWhere = dayParam
    ? "ch.zone = $1 and f.day = $2::date"
    : "ch.zone = $1 and f.day >= current_date";
  const attributeParams = dayParam ? [zone, dayParam] : [zone];
  const attributeRows = await db.query(
    `select f.camera_id,
            f.channel_no,
            coalesce(sum(f.total), 0) as faces_total,
            coalesce(sum(f.male), 0) as male_count,
            coalesce(sum(f.female), 0) as female_count,
            coalesce(sum(f.unknown_gender), 0) as gender_unknown,
            coalesce(sum(f.glasses_yes), 0) as glasses_yes,
            coalesce(sum(f.glasses_no), 0) as glasses_no,
            coalesce(sum(f.glasses_unknown), 0) as glasses_unknown,
            coalesce(sum(f.age_child), 0) as child_count,
            coalesce(sum(f.age_teen), 0) as teen_count,
            coalesce(sum(f.age_young_adult), 0) as young_count,
            coalesce(sum(f.age_middle_age), 0) as middle_count,
            coalesce(sum(f.age_senior), 0) as senior_count,
            coalesce(sum(f.age_unknown), 0) as age_unknown_count
     from face_stats_daily f
     join channels ch
       on ch.camera_id = f.camera_id and ch.channel_no = f.channel_no
     where ${attributeWhere}
     group by f.camera_id, f.channel_no`,
    attributeParams
  );

  const statsMap = new Map<string, ChannelStats>();
  const ageMap = new Map<string, AgeBuckets>();

  const keyFor = (cameraId: string, channelNo: number) => `${cameraId}:${channelNo}`;

  for (const row of peopleRows.rows) {
    const cameraId = row.camera_id as string;
    const channelNo = Number(row.channel_no);
    statsMap.set(keyFor(cameraId, channelNo), {
      peopleIn: Number(row.people_in ?? 0),
      peopleOut: Number(row.people_out ?? 0),
      faceEvents: 0,
      facesDetected: 0,
      gender: { male: 0, female: 0, unknown: 0 },
      age: { avg: null },
      glasses: { yes: 0, no: 0, unknown: 0 },
      lastEventAt: row.last_people_event
        ? new Date(row.last_people_event).toISOString()
        : null
    });
  }

  for (const row of faceRows.rows) {
    const cameraId = row.camera_id as string;
    const channelNo = Number(row.channel_no);
    const key = keyFor(cameraId, channelNo);
    const existing = statsMap.get(key) ?? emptyStats();
    const lastFace = row.last_face_event
      ? new Date(row.last_face_event).toISOString()
      : null;
    statsMap.set(key, {
      ...existing,
      faceEvents: existing.faceEvents,
      facesDetected: existing.facesDetected,
      lastEventAt: existing.lastEventAt || lastFace
    });
  }

  for (const row of attributeRows.rows) {
    const cameraId = row.camera_id as string;
    const channelNo = Number(row.channel_no);
    const key = keyFor(cameraId, channelNo);
    const existing = statsMap.get(key) ?? emptyStats();
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
    statsMap.set(key, {
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
    ageMap.set(key, {
      child,
      teen,
      youngAdult: young,
      middleAge: middle,
      senior,
      unknown: Number(row.age_unknown_count ?? 0)
    });
  }

  return NextResponse.json({
    ok: true,
    zone,
    channels: channelsResult.rows.map((row) => {
      const cameraId = row.camera_id as string;
      const channelNo = Number(row.channel_no);
      return {
        cameraId,
        cameraIp: row.ip as string,
        cameraName: row.camera_name as string | null,
        channelId: String(channelNo),
        channelName:
          typeof row.channel_name === "string" && row.channel_name.trim()
            ? row.channel_name.trim()
            : `Channel ${channelNo}`,
        zone: row.zone as string | null,
        features: (row.features as string[]) ?? [],
        capabilities: row.capabilities ?? null,
        stats: statsMap.get(keyFor(cameraId, channelNo)) ?? emptyStats(),
        ageBuckets: ageMap.get(keyFor(cameraId, channelNo)) ?? emptyAgeBuckets()
      };
    })
  });
}
