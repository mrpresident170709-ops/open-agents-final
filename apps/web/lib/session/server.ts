import type { NextRequest } from "next/server";
import type { Session } from "./types";
import { SESSION_COOKIE_NAME } from "./constants";
import { LOCAL_SESSION } from "./local-user";
import { decryptJWE } from "@/lib/jwe/decrypt";
import { getEnv } from "@/lib/env";

export async function getSessionFromCookie(
  cookieValue?: string,
): Promise<Session | undefined> {
  const env = getEnv();
  if (env.SINGLE_USER_MODE === "true") {
    return LOCAL_SESSION;
  }
  if (cookieValue) {
    const decrypted = await decryptJWE<Session>(cookieValue);
    if (decrypted) {
      return {
        created: decrypted.created,
        authProvider: decrypted.authProvider,
        user: decrypted.user,
      };
    }
  }
}

export async function getSessionFromReq(
  req: NextRequest,
): Promise<Session | undefined> {
  const env = getEnv();
  if (env.SINGLE_USER_MODE === "true") {
    return LOCAL_SESSION;
  }
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
}
