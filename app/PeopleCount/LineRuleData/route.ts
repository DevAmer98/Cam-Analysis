import { NextResponse } from "next/server";
import { recordPeopleCount } from "../../../lib/cameraStore";
import { getDbPool } from "../../../lib/db";
import { emitCameraEvent } from "../../../lib/eventBus";
import { getChannelId, getRequestIp } from "../../../lib/unvEvents";
import { extractIp, safeJsonParse } from "../../../lib/unvUtils";

export async function POST(req: Request) {
  const raw = await req.text();
  const payload = safeJsonParse(raw);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ResponseCode: 0 });
  }
  const ip = getRequestIp(req, payload, raw);
  const channelId = getChannelId(payload);
  const list =
    (payload as Record<string, unknown>)["LineRuleDataList"] ??
    (payload as Record<string, unknown>)["LineRuleData"];

  if (Array.isArray(list)) {
    const db = getDbPool();
    const cameraResult = await db.query(
      `insert into cameras (ip)
       values ($1)
       on conflict (ip) do update set ip = excluded.ip, updated_at = now()
       returning id`,
      [extractIp(ip) ?? ip]
    );
    const cameraId = cameraResult.rows[0]?.id as string;
    await db.query(
      `insert into channels (camera_id, channel_no, name)
       values ($1, $2, $3)
       on conflict (camera_id, channel_no) do nothing`,
      [cameraId, Number(channelId), `Channel ${channelId}`]
    );
    for (const line of list) {
      if (!line || typeof line !== "object") continue;
      const objectIn = Number((line as Record<string, unknown>)["ObjectIn"] ?? 0);
      const objectOut = Number((line as Record<string, unknown>)["ObjectOut"] ?? 0);
      const lineId = Number((line as Record<string, unknown>)["LineID"] ?? 0);
      const eventTimeRaw = (payload as Record<string, unknown>)["TimeStamp"];
      const eventTime =
        typeof eventTimeRaw === "number"
          ? new Date(eventTimeRaw * 1000).toISOString()
          : typeof eventTimeRaw === "string"
            ? new Date(Number(eventTimeRaw) * 1000).toISOString()
            : new Date().toISOString();
      recordPeopleCount({
        ip: extractIp(ip) ?? ip,
        channelId,
        objectIn,
        objectOut,
        timestamp: eventTime
      });
      await db.query(
        `insert into people_count_events
         (camera_id, channel_no, line_id, object_in, object_out, event_time, raw_payload)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [cameraId, Number(channelId), lineId, objectIn, objectOut, eventTime, payload]
      );
      emitCameraEvent({
        type: "people-count",
        ip: extractIp(ip) ?? ip,
        channelId: String(channelId),
        timestamp: eventTime
      });
    }
  }

  return NextResponse.json({ ResponseCode: 0 });
}
