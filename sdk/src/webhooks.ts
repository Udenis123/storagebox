import type { WebhookPayload } from "./types.js";

const encoder = new TextEncoder();

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

/**
 * Verifies the `x-storagebox-signature` header against the RAW request body (not re-serialised JSON)
 * and returns the parsed payload, or `null` when the signature does not match.
 */
export async function verifyWebhook<T = WebhookPayload>(rawBody: string, signature: string | null | undefined, secret: string): Promise<T | null> {
  if (!signature) return null;
  const expected = await hmacHex(secret, rawBody);
  return constantTimeEqual(expected, signature.trim().toLowerCase()) ? (JSON.parse(rawBody) as T) : null;
}
