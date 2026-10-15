import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { importPKCS8, SignJWT } from "jose";

import { readEnv } from "@/lib/utils";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

function encryptionKey() {
  const value = Buffer.from(readEnv("ACCOUNT_DELETION_TOKEN_ENCRYPTION_KEY"), "base64");
  if (value.length !== 32) throw new Error("ACCOUNT_DELETION_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return value;
}

export function encryptAppleRefreshToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptAppleRefreshToken(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function appleClientSecret() {
  const privateKey = readEnv("APPLE_SIGN_IN_PRIVATE_KEY").replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: readEnv("APPLE_SIGN_IN_KEY_ID") })
    .setIssuedAt(now)
    .setIssuer(readEnv("APPLE_SIGN_IN_TEAM_ID"))
    .setAudience("https://appleid.apple.com")
    .setSubject(readEnv("APPLE_SIGN_IN_CLIENT_ID"))
    .setExpirationTime(now + 60 * 60 * 24 * 30)
    .sign(key);
}

function formBody(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

export async function exchangeAppleAuthorizationCode(authorizationCode: string) {
  const clientId = readEnv("APPLE_SIGN_IN_CLIENT_ID");
  const response = await fetch(APPLE_TOKEN_URL, {
    body: formBody({
      client_id: clientId,
      client_secret: await appleClientSecret(),
      code: authorizationCode,
      grant_type: "authorization_code"
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST"
  });
  const body = await response.json().catch(() => null) as { refresh_token?: string } | null;
  if (!response.ok || !body?.refresh_token) throw new Error("Apple did not return a refresh token.");
  return body.refresh_token;
}

export async function revokeStoredAppleToken(encryptedToken?: string | null) {
  if (!encryptedToken) return "not_available" as const;

  try {
    const response = await fetch(APPLE_REVOKE_URL, {
      body: formBody({
        client_id: readEnv("APPLE_SIGN_IN_CLIENT_ID"),
        client_secret: await appleClientSecret(),
        token: decryptAppleRefreshToken(encryptedToken),
        token_type_hint: "refresh_token"
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST"
    });
    return response.ok ? ("revoked" as const) : ("failed" as const);
  } catch {
    return "failed" as const;
  }
}
