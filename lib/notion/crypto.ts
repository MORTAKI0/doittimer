import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;

function getKeyBuffer(encryptionKey: string) {
  return Buffer.from(encryptionKey, "hex");
}

export function encryptNotionToken(token: string, encryptionKey: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKeyBuffer(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptNotionToken(payload: string, encryptionKey: string) {
  const [ivHex, authTagHex, encryptedHex] = payload.split(".");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Encrypted Notion token payload is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKeyBuffer(encryptionKey),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
