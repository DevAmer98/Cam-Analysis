import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDbPool } from "../../../../lib/db";

const csvEscape = (value: unknown) => {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, "\"\"")}"`;
  return raw;
};

const row = (values: unknown[]) => values.map(csvEscape).join(",");
const htmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
  }

  const url = new URL(req.url);
  const day = url.searchParams.get("day")?.trim() || "";
  const requestedZone = url.searchParams.get("zone")?.trim() || "";
  const scope = url.searchParams.get("scope") === "zone" ? "zone" : "all";
  const format = url.searchParams.get("format") === "xls" ? "xls" : "csv";
  if (scope === "zone" && !requestedZone) {
    return NextResponse.json(
      { ok: false, error: "Please select a zone for zone-scope report." },
      { status: 400 }
    );
  }
  const zone = scope === "zone" ? requestedZone : "";
  const db = getDbPool();

  const peopleWhere = day ? "day = $1::date" : "day >= current_date";
  const peopleParams = day ? [day] : [];
  const totalsResult = await db.query(
    `select coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out
     from counting_stats_daily
     where ${peopleWhere}`,
    peopleParams
  );

  const faceWhere = day ? "day = $1::date" : "day >= current_date";
  const faceParams = day ? [day] : [];
  const faceResult = await db.query(
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
    faceParams
  );

  const zoneParams = zone ? [zone, ...(day ? [day] : [])] : day ? [day] : [];
  const zoneCondition = zone ? "ch.zone = $1" : "1=1";
  const dayCondition = day ? `and p.day = $${zone ? 2 : 1}::date` : "and p.day >= current_date";
  const zonePeopleResult = await db.query(
    `select coalesce(sum(p.in_count), 0) as people_in,
            coalesce(sum(p.out_count), 0) as people_out
     from counting_stats_daily p
     join channels ch on ch.camera_id = p.camera_id and ch.channel_no = p.channel_no
     where ${zoneCondition} ${dayCondition}`,
    zoneParams
  );

  const zoneFaceParams = zone ? [zone, ...(day ? [day] : [])] : day ? [day] : [];
  const zoneFaceCondition = zone ? "ch.zone = $1" : "1=1";
  const zoneFaceDayCondition =
    day
      ? `and f.day = $${zone ? 2 : 1}::date`
      : "and f.day >= current_date";
  const zoneFaceResult = await db.query(
    `select coalesce(sum(f.total), 0) as faces_total,
            coalesce(sum(f.male), 0) as male_count,
            coalesce(sum(f.female), 0) as female_count,
            coalesce(sum(f.unknown_gender), 0) as unknown_count
     from face_stats_daily f
     join channels ch on ch.camera_id = f.camera_id and ch.channel_no = f.channel_no
     where ${zoneFaceCondition} ${zoneFaceDayCondition}`,
    zoneFaceParams
  );

  const detailsParams = zone ? [zone, ...(day ? [day] : [])] : day ? [day] : [];
  const detailsZoneCondition = zone ? "ch.zone = $1" : "1=1";
  const detailsDayJoinCondition =
    day ? `and p.day = $${zone ? 2 : 1}::date` : "and p.day >= current_date";
  const detailsResult = await db.query(
    `select c.ip,
            coalesce(c.name, c.ip) as camera_name,
            ch.channel_no,
            coalesce(ch.name, concat('Channel ', ch.channel_no::text)) as channel_name,
            coalesce(sum(p.in_count), 0) as people_in,
            coalesce(sum(p.out_count), 0) as people_out
     from channels ch
     join cameras c on c.id = ch.camera_id
     left join counting_stats_daily p
       on p.camera_id = ch.camera_id
      and p.channel_no = ch.channel_no
      ${detailsDayJoinCondition}
     where ${detailsZoneCondition}
     group by c.ip, c.name, ch.channel_no, ch.name
     order by coalesce(c.name, c.ip), ch.channel_no`,
    detailsParams
  );

  const totals = totalsResult.rows[0] ?? {};
  const face = faceResult.rows[0] ?? {};
  const zonePeople = zonePeopleResult.rows[0] ?? {};
  const zoneFace = zoneFaceResult.rows[0] ?? {};

  const lines: string[] = [];
  lines.push(row(["report_day", day || "today"]));
  lines.push(row(["report_scope", scope]));
  lines.push(row(["zone_filter", zone || "all"]));
  lines.push("");
  lines.push(row(["section", "metric", "value"]));
  lines.push(row(["all_devices", "people_in", Number(totals.people_in ?? 0)]));
  lines.push(row(["all_devices", "people_out", Number(totals.people_out ?? 0)]));
  lines.push(row(["all_devices", "gender_male", Number(face.male_count ?? 0)]));
  lines.push(row(["all_devices", "gender_female", Number(face.female_count ?? 0)]));
  lines.push(row(["all_devices", "gender_unknown", Number(face.unknown_count ?? 0)]));
  lines.push(row(["all_devices", "age_child", Number(face.child_count ?? 0)]));
  lines.push(row(["all_devices", "age_teen", Number(face.teen_count ?? 0)]));
  lines.push(row(["all_devices", "age_young_adult", Number(face.young_count ?? 0)]));
  lines.push(row(["all_devices", "age_middle_age", Number(face.middle_count ?? 0)]));
  lines.push(row(["all_devices", "age_senior", Number(face.senior_count ?? 0)]));
  lines.push(row(["all_devices", "age_unknown", Number(face.age_unknown_count ?? 0)]));
  lines.push(row(["zone_scope", "people_in", Number(zonePeople.people_in ?? 0)]));
  lines.push(row(["zone_scope", "people_out", Number(zonePeople.people_out ?? 0)]));
  lines.push(row(["zone_scope", "occupancy", Number(zonePeople.people_in ?? 0) - Number(zonePeople.people_out ?? 0)]));
  lines.push(row(["zone_scope", "faces_total", Number(zoneFace.faces_total ?? 0)]));
  lines.push(row(["zone_scope", "gender_male", Number(zoneFace.male_count ?? 0)]));
  lines.push(row(["zone_scope", "gender_female", Number(zoneFace.female_count ?? 0)]));
  lines.push(row(["zone_scope", "gender_unknown", Number(zoneFace.unknown_count ?? 0)]));
  lines.push("");
  lines.push(row(["section", "camera_ip", "camera_name", "channel_no", "channel_name", "people_in", "people_out", "occupancy"]));
  for (const entry of detailsResult.rows) {
    const inCount = Number(entry.people_in ?? 0);
    const outCount = Number(entry.people_out ?? 0);
    lines.push(
      row([
        "channel",
        entry.ip,
        entry.camera_name,
        Number(entry.channel_no),
        entry.channel_name,
        inCount,
        outCount,
        Math.max(0, inCount - outCount)
      ])
    );
  }

  const zonePart = zone ? `-${zone.replace(/\s+/g, "_")}` : "";
  const dayPart = day || new Date().toISOString().slice(0, 10);
  if (format === "xls") {
    const summaryRows = lines
      .filter((line) => line.startsWith("all_devices,") || line.startsWith("zone_scope,"))
      .map((line) => line.split(","));
    const detailRows = detailsResult.rows.map((entry) => {
      const inCount = Number(entry.people_in ?? 0);
      const outCount = Number(entry.people_out ?? 0);
      return [
        entry.ip,
        entry.camera_name,
        Number(entry.channel_no),
        entry.channel_name,
        inCount,
        outCount,
        Math.max(0, inCount - outCount)
      ];
    });
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
      <table border="1">
        <tr><th>report_day</th><td>${htmlEscape(day || "today")}</td></tr>
        <tr><th>report_scope</th><td>${htmlEscape(scope)}</td></tr>
        <tr><th>zone_filter</th><td>${htmlEscape(zone || "all")}</td></tr>
      </table>
      <br />
      <table border="1">
        <tr><th>section</th><th>metric</th><th>value</th></tr>
        ${summaryRows
          .map(
            (r) =>
              `<tr><td>${htmlEscape(r[0])}</td><td>${htmlEscape(r[1])}</td><td>${htmlEscape(r[2])}</td></tr>`
          )
          .join("")}
      </table>
      <br />
      <table border="1">
        <tr><th>camera_ip</th><th>camera_name</th><th>channel_no</th><th>channel_name</th><th>people_in</th><th>people_out</th><th>occupancy</th></tr>
        ${detailRows
          .map(
            (r) =>
              `<tr><td>${htmlEscape(r[0])}</td><td>${htmlEscape(r[1])}</td><td>${htmlEscape(r[2])}</td><td>${htmlEscape(r[3])}</td><td>${htmlEscape(r[4])}</td><td>${htmlEscape(r[5])}</td><td>${htmlEscape(r[6])}</td></tr>`
          )
          .join("")}
      </table>
    </body></html>`;
    const filename = `camera-report-${dayPart}${zonePart}.xls`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`
      }
    });
  }

  const filename = `camera-report-${dayPart}${zonePart}.csv`;
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`
    }
  });
}
