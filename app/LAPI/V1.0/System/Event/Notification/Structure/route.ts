import { NextResponse } from "next/server";
import { recordFaceDetection } from "../../../../../../../lib/cameraStore";
import { getDbPool } from "../../../../../../../lib/db";
import { emitCameraEvent } from "../../../../../../../lib/eventBus";
import { getChannelId, getRequestIp } from "../../../../../../../lib/unvEvents";
import { safeJsonParse } from "../../../../../../../lib/unvUtils";

export async function POST(req: Request) {
  const raw = await req.text();
  const payload = safeJsonParse(raw);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ResponseCode: 0 });
  }
  const ip = getRequestIp(req, payload, raw);
  const channelId = getChannelId(payload);
  const structure = (payload as Record<string, unknown>)["StructureInfo"];
  const objInfo = structure && typeof structure === "object"
    ? (structure as Record<string, unknown>)["ObjInfo"]
    : null;
  const faceInfoList = objInfo && typeof objInfo === "object"
    ? (objInfo as Record<string, unknown>)["FaceInfoList"]
    : null;
  const facesDetected = Array.isArray(faceInfoList) ? faceInfoList.length : 0;

  recordFaceDetection({
    ip,
    channelId,
    facesDetected,
    timestamp: String((payload as Record<string, unknown>)["TimeStamp"] ?? "")
  });

  const db = getDbPool();
  const cameraResult = await db.query(
    `insert into cameras (ip)
     values ($1)
     on conflict (ip) do update set ip = excluded.ip, updated_at = now()
     returning id`,
    [ip]
  );
  const cameraId = cameraResult.rows[0]?.id as string;
  await db.query(
    `insert into channels (camera_id, channel_no, name)
     values ($1, $2, $3)
     on conflict (camera_id, channel_no) do nothing`,
    [cameraId, Number(channelId), `Channel ${channelId}`]
  );
  const eventTimeRaw = (payload as Record<string, unknown>)["TimeStamp"];
  const eventTime =
    typeof eventTimeRaw === "number"
      ? new Date(eventTimeRaw * 1000).toISOString()
      : typeof eventTimeRaw === "string"
        ? new Date(Number(eventTimeRaw) * 1000).toISOString()
        : new Date().toISOString();
  const faceEventResult = await db.query(
    `insert into face_events
     (camera_id, channel_no, event_time, faces_detected, raw_payload)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [cameraId, Number(channelId), eventTime, facesDetected, payload]
  );
  const faceEventId = faceEventResult.rows[0]?.id as string;

  if (Array.isArray(faceInfoList)) {
    for (const face of faceInfoList) {
      if (!face || typeof face !== "object") continue;
      const attrs =
        (face as Record<string, unknown>)["AttributeInfo"] &&
        typeof (face as Record<string, unknown>)["AttributeInfo"] === "object"
          ? ((face as Record<string, unknown>)["AttributeInfo"] as Record<string, unknown>)
          : {};
      await db.query(
        `insert into face_attributes
         (face_event_id, face_id, age, age_range, gender, glasses, mask, extra)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          faceEventId,
          (face as Record<string, unknown>)["FaceID"] ?? null,
          typeof attrs["Age"] === "number" ? attrs["Age"] : null,
          typeof attrs["AgeRange"] === "string" ? attrs["AgeRange"] : null,
          typeof attrs["Gender"] === "string" ? attrs["Gender"] : null,
          typeof attrs["Glasses"] === "string" ? attrs["Glasses"] : null,
          typeof attrs["Mask"] === "string" ? attrs["Mask"] : null,
          attrs
        ]
      );
    }
  }

  emitCameraEvent({
    type: "face-detection",
    ip,
    channelId: String(channelId),
    timestamp: eventTime
  });

  return NextResponse.json({ ResponseCode: 0 });
}
