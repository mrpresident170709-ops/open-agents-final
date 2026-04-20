import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import { getSessionFromCookie } from "./server";
import { LOCAL_SESSION } from "./local-user";
import { cache } from "react";

export const getServerSession = cache(async () => {
  if (process.env.SINGLE_USER_MODE === "true") {
    return LOCAL_SESSION;
  }
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
});
