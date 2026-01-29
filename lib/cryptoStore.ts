import crypto from "crypto";

type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is not set.");
  const buffer =
    key.length === 64 ? Buffer.from(key, "hex") : Buffer.from(key, "base64");
  if (buffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64 or hex).");
  }
  return buffer;
}

export function encryptSecret(value: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}
