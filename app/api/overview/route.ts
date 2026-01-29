import { NextResponse } from "next/server";
import { getDbPool } from "../../../lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = url.searchParams.get("day");
  const dayParam = day ? day.trim() : "";
  const db = getDbPool();

  const peopleWhere = dayParam ? "day = $1::date" : "day >= current_date";

  const totalsResult = await db.query(
    `select coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out
     from counting_stats_daily
     where ${peopleWhere}`,
    dayParam ? [dayParam] : []
  );

  const faceWhere = dayParam ? "day = $1::date" : "day >= current_date";
  const faceDailyResult = await db.query(
    `select
        coalesce(sum(male), 0) as male_count,
        coalesce(sum(female), 0) as female_count,
        coalesce(sum(unknown_gender), 0) as unknown_count,
        coalesce(sum(age_child), 0) as child_count,
        coalesce(sum(age_teen), 0) as teen_count,
        coalesce(sum(age_young_adult), 0) as young_count,
        coalesce(sum(age_middle_age), 0) as middle_count,
        coalesce(sum(age_senior), 0) as senior_count,
        coalesce(sum(age_unknown), 0) as age_unknown_count
     from face_stats_daily
     where ${faceWhere}`,
    dayParam ? [dayParam] : []
  );

  const totalsRow = totalsResult.rows[0] ?? {};
  const faceRow = faceDailyResult.rows[0] ?? {};

  return NextResponse.json({
    ok: true,
    totals: {
      peopleIn: Number(totalsRow.people_in ?? 0),
      peopleOut: Number(totalsRow.people_out ?? 0)
    },
    gender: {
      male: Number(faceRow.male_count ?? 0),
      female: Number(faceRow.female_count ?? 0),
      unknown: Number(faceRow.unknown_count ?? 0)
    },
    age: {
      child: Number(faceRow.child_count ?? 0),
      teen: Number(faceRow.teen_count ?? 0),
      youngAdult: Number(faceRow.young_count ?? 0),
      middleAge: Number(faceRow.middle_count ?? 0),
      senior: Number(faceRow.senior_count ?? 0),
      unknown: Number(faceRow.age_unknown_count ?? 0)
    }
  });
}
