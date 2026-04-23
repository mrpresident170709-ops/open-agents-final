import { jwtDecrypt, base64url } from "jose";
import { getJweSecret } from "@/lib/env";

export async function decryptJWE<T extends string | object = string | object>(
  cyphertext: string,
  secret?: string,
): Promise<T | undefined> {
  const jweSecret = secret || getJweSecret();
  if (typeof cyphertext !== "string") return;

  try {
    const { payload } = await jwtDecrypt(cyphertext, base64url.decode(jweSecret));
    const decoded = payload as T;
    if (typeof decoded === "object" && decoded !== null) {
      delete (decoded as Record<string, unknown>).iat;
      delete (decoded as Record<string, unknown>).exp;
    }
    return decoded;
  } catch {
    return undefined;
  }
}
