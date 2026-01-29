import { NextResponse } from "next/server";
import { getDbPool } from "../../../../lib/db";

export const runtime = "nodejs";

type DevicePayload = {
  ip?: string;
  name?: string;
  deviceType?: string;
  username?: string;
  password?: string;
};

function normalizeDeviceType(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["ai_box", "aibox", "ai-box", "ai"].includes(normalized)) return "ai_box";
  if (["camera", "cam"].includes(normalized)) return "camera";
  return null;
}

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) as DevicePayload;
  const ip = typeof payload.ip === "string" ? payload.ip.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const deviceType = normalizeDeviceType(payload.deviceType ?? "");
  const username = typeof payload.username === "string" ? payload.username : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!ip || !deviceType) {
    return NextResponse.json(
      { ok: false, error: "Missing ip or deviceType." },
      { status: 400 }
    );
  }

  const db = getDbPool();
  const result = await db.query(
    `insert into cameras (ip, name, device_type)
     values ($1, $2, $3)
     on conflict (ip)
     do update set
       name = excluded.name,
       device_type = excluded.device_type
     returning id`,
    [ip, name || null, deviceType]
  );

  const serverUrl = process.env.UNV_SERVER_URL;
  let serverResult: { ok: boolean; error?: string } | null = null;
  if (serverUrl) {
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip,
          deviceType,
          username,
          password
        })
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      serverResult = { ok: Boolean(data.ok), error: data.error };
    } catch (err) {
      serverResult = { ok: false, error: (err as Error).message };
    }
  }

  return NextResponse.json({
    ok: true,
    id: result.rows[0]?.id as string,
    server: serverResult
  });
}
