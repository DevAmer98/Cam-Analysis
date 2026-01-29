import { NextResponse } from "next/server";
import { DigestClient } from "../../../../lib/digestClient";
import { getCameraStats, ensureChannel } from "../../../../lib/cameraStore";
import { encryptSecret } from "../../../../lib/cryptoStore";
import { getDbPool } from "../../../../lib/db";
import { detectFeatures, getObjectArray, safeJsonParse } from "../../../../lib/unvUtils";

type ChannelInfo = {
  id: string;
  name: string;
};

export const runtime = "nodejs";

function normalizeDeviceType(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["ai_box", "aibox", "ai-box", "ai"].includes(normalized)) return "ai_box";
  if (["camera", "cam"].includes(normalized)) return "camera";
  return null;
}

function extractChannels(payload: unknown): ChannelInfo[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => entry as Record<string, unknown>)
      .map((entry) => {
        const idValue = entry.ChannelID ?? entry.ID ?? entry.channelId ?? entry.Channel;
        const nameValue = entry.Name ?? entry.ChannelName ?? entry.Alias ?? entry.DisplayName;
        const id = idValue ? String(idValue) : "0";
        const name =
          typeof nameValue === "string" && nameValue.trim()
            ? nameValue.trim()
            : `Channel ${id}`;
        return { id, name };
      });
  }
  const nested =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)["Response"]
      : null;
  const nestedData =
    nested && typeof nested === "object" ? (nested as Record<string, unknown>)["Data"] : null;

  const list = getObjectArray(payload, [
    "ChannelDetailInfoList",
    "ChannelDetailInfos",
    "ChannelList",
    "Channels"
  ]).length
    ? getObjectArray(payload, [
        "ChannelDetailInfoList",
        "ChannelDetailInfos",
        "ChannelList",
        "Channels"
      ])
    : getObjectArray(nestedData, ["DetailInfos", "ChannelDetailInfos"]);
  return list.map((entry) => {
    const idValue = entry.ChannelID ?? entry.ID ?? entry.channelId ?? entry.Channel;
    const nameValue = entry.Name ?? entry.ChannelName ?? entry.Alias ?? entry.DisplayName;
    const id = idValue ? String(idValue) : "0";
    const name =
      typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : `Channel ${id}`;
    return { id, name };
  });
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const ip = typeof payload?.ip === "string" ? payload.ip.trim() : "";
  const username = typeof payload?.username === "string" ? payload.username : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const deviceType = normalizeDeviceType(payload?.deviceType) ?? "camera";

  if (!ip || !username || !password) {
    return NextResponse.json(
      { ok: false, error: "Missing ip/username/password" },
      { status: 400 }
    );
  }

  const digest = new DigestClient(username, password, "MD5");
  const warnings: string[] = [];

  try {
    const channelRes = await digest.fetch(
      `http://${ip}/LAPI/V1.0/Channels/System/ChannelDetailInfos`,
      { method: "GET", headers: { Accept: "application/json" } }
    );
    const channelText = await channelRes.text();
    if (!channelRes.ok) {
      throw new Error(`Channel query failed (${channelRes.status}): ${channelText}`);
    }
    const channelPayload = safeJsonParse(channelText);
    const channels = extractChannels(channelPayload);
    if (channels.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No channels returned by camera." },
        { status: 400 }
      );
    }

    const capabilityResults = await Promise.all(
      channels.map(async (channel) => {
        const url = `http://${ip}/LAPI/V1.0/Channels/${channel.id}/Alarm/Capabilities`;
        try {
          const capRes = await digest.fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" }
          });
          const capText = await capRes.text();
          if (!capRes.ok) {
            warnings.push(`Capabilities ${channel.id} failed (${capRes.status}).`);
            return { channelId: channel.id, features: [], raw: capText };
          }
          const capPayload = safeJsonParse(capText);
          return {
            channelId: channel.id,
            features: detectFeatures(capPayload ?? capText),
            raw: capPayload ?? capText
          };
        } catch (err) {
          warnings.push(`Capabilities ${channel.id} error: ${(err as Error).message}`);
          return { channelId: channel.id, features: [], raw: null };
        }
      })
    );

    const db = getDbPool();
    const encrypted = encryptSecret(password);
    const cameraResult = await db.query(
      `insert into cameras (ip, name, device_type, username, password_ciphertext, password_iv, password_tag)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (ip)
       do update set
         name = excluded.name,
         device_type = excluded.device_type,
         username = excluded.username,
         password_ciphertext = excluded.password_ciphertext,
         password_iv = excluded.password_iv,
         password_tag = excluded.password_tag,
         updated_at = now()
       returning id`,
      [
        ip,
        name || null,
        deviceType,
        username,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag
      ]
    );
    const cameraId = cameraResult.rows[0]?.id as string;

    for (const channel of channels) {
      const featureInfo = capabilityResults.find((item) => item.channelId === channel.id);
      await db.query(
        `insert into channels (camera_id, channel_no, name, features, capabilities)
         values ($1, $2, $3, $4, $5)
         on conflict (camera_id, channel_no)
         do update set
           name = excluded.name,
           features = excluded.features,
           capabilities = excluded.capabilities,
           updated_at = now()`,
        [
          cameraId,
          Number(channel.id),
          channel.name,
          featureInfo?.features ?? [],
          featureInfo?.raw ?? null
        ]
      );
    }

    const stats = getCameraStats(ip);
    const statsMap = new Map(stats.channels.map((entry) => [entry.channelId, entry.stats]));

    const channelsWithFeatures = channels.map((channel) => {
      const featureInfo = capabilityResults.find((item) => item.channelId === channel.id);
      const statsEntry = statsMap.get(channel.id) ?? ensureChannel(ip, channel.id);
      return {
        id: channel.id,
        name: channel.name,
        features: featureInfo?.features ?? [],
        stats: statsEntry
      };
    });

    const featuresDetected = Array.from(
      new Set(channelsWithFeatures.flatMap((channel) => channel.features))
    );

    return NextResponse.json({
      ok: true,
      ip,
      channels: channelsWithFeatures,
      featuresDetected,
      warnings
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "Failed to connect to camera." },
      { status: 500 }
    );
  }
}
