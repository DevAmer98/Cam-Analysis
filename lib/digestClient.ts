import crypto from "crypto";

type DigestParams = {
  realm?: string;
  nonce?: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
};

const hash = (value: string, algorithm = "md5") =>
  crypto.createHash(algorithm).update(value).digest("hex");

const parseAuthHeader = (header: string): DigestParams => {
  const params: DigestParams = {};
  const trimmed = header.replace(/^Digest\s+/i, "");
  const parts = trimmed.match(/([a-zA-Z]+)=("[^"]*"|[^,]*)/g) ?? [];
  for (const part of parts) {
    const [key, raw] = part.split("=");
    params[key as keyof DigestParams] = raw?.replace(/^"|"$/g, "");
  }
  return params;
};

export class DigestClient {
  private username: string;
  private password: string;
  private nc = 0;
  private params: DigestParams = {};

  constructor(username: string, password: string, private algorithm = "MD5") {
    this.username = username;
    this.password = password;
  }

  private async getFetch() {
    if (typeof globalThis.fetch === "function") return globalThis.fetch;
    throw new Error("Fetch API is not available in this runtime.");
  }

  private buildAuthHeader(method: string, url: URL) {
    const realm = this.params.realm ?? "";
    const nonce = this.params.nonce ?? "";
    const qopRaw = this.params.qop ?? "";
    const qop = qopRaw.includes("auth") ? "auth" : qopRaw || undefined;
    const uri = url.pathname + url.search;
    const cnonce = crypto.randomBytes(8).toString("hex");
    const nc = (++this.nc).toString(16).padStart(8, "0");
    const algo = this.algorithm.toLowerCase();

    const ha1 = hash(`${this.username}:${realm}:${this.password}`, algo);
    const ha2 = hash(`${method}:${uri}`, algo);
    const response = qop
      ? hash(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`, algo)
      : hash(`${ha1}:${nonce}:${ha2}`, algo);

    const parts = [
      `username="${this.username}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${uri}"`,
      `response="${response}"`
    ];

    if (this.params.opaque) parts.push(`opaque="${this.params.opaque}"`);
    if (qop) {
      parts.push(`qop=${qop}`);
      parts.push(`nc=${nc}`);
      parts.push(`cnonce="${cnonce}"`);
    }
    if (this.algorithm) parts.push(`algorithm=${this.algorithm}`);

    return `Digest ${parts.join(", ")}`;
  }

  async fetch(input: string, init: RequestInit = {}) {
    const url = new URL(input);
    const fetcher = await this.getFetch();
    const method = (init.method ?? "GET").toUpperCase();

    const response = await fetcher(input, init);
    if (response.status !== 401) return response;

    const header = response.headers.get("www-authenticate");
    if (!header) return response;

    this.params = parseAuthHeader(header);
    const authHeader = this.buildAuthHeader(method, url);
    const retryInit: RequestInit = {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: authHeader
      }
    };

    return fetcher(input, retryInit);
  }
}
