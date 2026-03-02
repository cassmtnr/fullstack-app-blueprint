import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
