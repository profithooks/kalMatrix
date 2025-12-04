import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  const buf = Buffer.alloc(32);
  Buffer.from(key).copy(buf);
  return buf;
}

export function encryptSecret(plain) {
  if (!plain) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const enc = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    enc.toString("base64"),
    authTag.toString("base64"),
  ].join(".");
}

export function decryptSecret(cipherText) {
  if (!cipherText) return null;

  const parts = cipherText.split(".");
  // Old plain tokens (JWT, random string, etc.) → no 3-part AES blob
  if (parts.length !== 3) {
    return cipherText;
  }

  const key = getKey();
  const [ivB64, encB64, tagB64] = parts;

  try {
    const iv = Buffer.from(ivB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);

    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch (e) {
    // If it’s not our encrypted format (e.g. JWT), just return as-is.
    return cipherText;
  }
}
