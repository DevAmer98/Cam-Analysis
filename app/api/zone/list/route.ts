import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

export async function GET() {
  const db = getDbPool();
  const result = await db.query(
    `select distinct zone
     from channels
     where zone is not null and trim(zone) <> ''
     order by zone asc`
  );

  return NextResponse.json({
    ok: true,
    zones: result.rows.map((row) => row.zone as string)
  });
}
