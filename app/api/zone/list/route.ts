import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDbPool();
  const result = await db.query(
    `select distinct zone
     from channels
     where zone is not null and trim(zone) <> ''
     order by zone asc`
  );
  const zoneRows = result.rows as Array<{ zone: string }>;

  return NextResponse.json({
    ok: true,
    zones: zoneRows.map((row) => row.zone)
  });
}
