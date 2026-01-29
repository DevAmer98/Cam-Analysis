type SafeJson = Record<string, unknown> | unknown[] | null;

export function safeJsonParse(raw: string): SafeJson {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const trimmed = raw.slice(start, end + 1);
    const sanitized = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

export function extractIp(input: string): string | null {
  const match = input.match(
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/
  );
  return match ? match[0] : null;
}

export function detectFeatures(payload: unknown): string[] {
  if (!payload) return [];
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const value = raw.toLowerCase();
  const features: string[] = [];

  if (value.includes("peoplecount") || value.includes("line") || value.includes("linecount")) {
    features.push("people-count");
  }
  if (value.includes("face") || value.includes("structure")) {
    features.push("face-detection");
  }
  if (value.includes("alarm")) {
    features.push("alarm");
  }

  if (payload && typeof payload === "object") {
    const response = (payload as Record<string, unknown>)["Response"];
    const data =
      response && typeof response === "object"
        ? (response as Record<string, unknown>)["Data"]
        : (payload as Record<string, unknown>)["Data"];

    if (data && typeof data === "object") {
      const mapEntry = (key: string, label: string, flag: "SupportCfg" | "IsSupportCfg") => {
        const entry = (data as Record<string, unknown>)[key];
        if (!entry || typeof entry !== "object") return;
        const supported = (entry as Record<string, unknown>)[flag];
        if (Number(supported) === 1) features.push(label);
      };

      mapEntry("MotionDetection", "motion-detection", "IsSupportCfg");
      mapEntry("TamperDetection", "tamper-detection", "IsSupportCfg");
      mapEntry("AudioDetection", "audio-detection", "SupportCfg");
      mapEntry("HumanShapeDetection", "human-shape-detection", "SupportCfg");
      mapEntry("ConflagrationDetection", "conflagration-detection", "IsSupportCfg");
      const tempEntry = (data as Record<string, unknown>)["TemperatureDetection"];
      if (tempEntry && typeof tempEntry === "object") {
        const supportType = (tempEntry as Record<string, unknown>)["SupportTypeNum"];
        if (Number(supportType) > 0) features.push("temperature-detection");
      }

      const supportConflagration = (data as Record<string, unknown>)["SupportConflagration"];
      if (Number(supportConflagration) === 1) features.push("conflagration");
      const supportSmoking = (data as Record<string, unknown>)["SupportSmokingDetection"];
      if (Number(supportSmoking) === 1) features.push("smoking-detection");
    }
  }

  return Array.from(new Set(features));
}

export function getObjectArray(input: unknown, keys: string[]): Record<string, unknown>[] {
  if (!input || typeof input !== "object") return [];
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      return value.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[];
    }
  }
  return [];
}
