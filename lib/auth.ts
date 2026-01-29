import crypto from "crypto";

export type UserRole = "admin" | "user";

type SessionPayload = {
  username: string;
  role: UserRole;
  exp: number;
};

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const getSecret = () => process.env.AUTH_SECRET || "dev-secret";

const base64urlEncode = (value: string) => Buffer.from(value).toString("base64url");
const base64urlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string) =>
  crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");

export function createSession(username: string, role: UserRole) {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload: SessionPayload = { username, role, exp };
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const token = `${payloadEncoded}.${sign(payloadEncoded)}`;
  return { token, exp };
}

export function verifySession(token: string | undefined) {
  if (!token) return null;
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;
  if (sign(payloadEncoded) !== signature) return null;
  try {
    const payload = JSON.parse(base64urlDecode(payloadEncoded)) as SessionPayload;
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | null) {
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {} as Record<string, string>);
}

export function getSessionFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySession(cookies[SESSION_COOKIE]);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsRaw, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !salt || !hash) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const derived = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}
