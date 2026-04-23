import { EncryptJWT, base64url } from "jose";
import { getJweSecret } from "@/lib/env";

export async function encryptJWE<T extends string | object>(
  payload: T,
  expirationTime: string,
  secret?: string,
): Promise<string> {
  const jweSecret = secret || getJweSecret();
  return new EncryptJWT(payload as Record<string, unknown>)
    .setExpirationTime(expirationTime)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(base64url.decode(jweSecret));
}
