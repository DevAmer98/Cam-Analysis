import { extractIp } from "./unvUtils";

export function getRequestIp(req: Request, payload?: unknown, raw?: string): string {
  const url = new URL(req.url);
  const ipParam = url.searchParams.get("ip");
  if (ipParam) {
    const extracted = extractIp(ipParam);
    if (extracted) return extracted;
    return ipParam;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  if (payload && typeof payload === "object") {
    const reference = (payload as Record<string, unknown>)["Reference"];
    if (typeof reference === "string") {
      const refIp = extractIp(reference);
      if (refIp) return refIp;
    }
    const srcName = (payload as Record<string, unknown>)["SrcName"];
    if (typeof srcName === "string") {
      const srcIp = extractIp(srcName);
      if (srcIp) return srcIp;
    }
  }
  if (raw) {
    const rawIp = extractIp(raw);
    if (rawIp) return rawIp;
  }
  return "unknown";
}

export function getChannelId(payload?: unknown): string {
  if (!payload || typeof payload !== "object") return "0";
  const candidateKeys = ["ChannelID", "ChannelId", "channelId", "Channel"];
  for (const key of candidateKeys) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "number" || typeof value === "string") return String(value);
  }
  const structureInfo = (payload as Record<string, unknown>)["StructureInfo"];
  if (structureInfo && typeof structureInfo === "object") {
    const value = (structureInfo as Record<string, unknown>)["ChannelID"];
    if (typeof value === "number" || typeof value === "string") return String(value);
  }
  return "0";
}
