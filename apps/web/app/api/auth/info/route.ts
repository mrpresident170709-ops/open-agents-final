import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getGitHubAccount } from "@/lib/db/accounts";
import { getInstallationsByUserId } from "@/lib/db/installations";
import { ensureLocalAdminUser, userExists } from "@/lib/db/users";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";
import { LOCAL_SESSION, LOCAL_USER_ID } from "@/lib/session/local-user";
import { getSessionFromReq } from "@/lib/session/server";
import type { SessionUserInfo } from "@/lib/session/types";

const UNAUTHENTICATED: SessionUserInfo = { user: undefined };

export async function GET(req: NextRequest) {
  if (process.env.SINGLE_USER_MODE === "true") {
    await ensureLocalAdminUser(LOCAL_USER_ID);
    const installations = await getInstallationsByUserId(LOCAL_USER_ID);
    const ghAccount = await getGitHubAccount(LOCAL_USER_ID);
    const hasGitHubAccount = ghAccount !== null;
    const hasGitHubInstallations = installations.length > 0;
    const hasGitHub = hasGitHubAccount || hasGitHubInstallations;
    const data: SessionUserInfo = {
      user: LOCAL_SESSION.user,
      authProvider: LOCAL_SESSION.authProvider,
      hasGitHub,
      hasGitHubAccount,
      hasGitHubInstallations,
    };
    return Response.json(data);
  }

  const session = await getSessionFromReq(req);

  if (!session?.user?.id) {
    return Response.json(UNAUTHENTICATED);
  }

  // Run the user-existence check in parallel with the GitHub queries
  // so there is zero added latency on the happy path.
  const [exists, ghAccount, installations] = await Promise.all([
    userExists(session.user.id),
    getGitHubAccount(session.user.id),
    getInstallationsByUserId(session.user.id),
  ]);

  // The session cookie (JWE) is self-contained and can outlive the user record.
  // If the user no longer exists, clear the stale cookie.
  if (!exists) {
    const store = await cookies();
    store.delete(SESSION_COOKIE_NAME);
    return Response.json(UNAUTHENTICATED);
  }

  const hasGitHubAccount = ghAccount !== null;
  const hasGitHubInstallations = installations.length > 0;
  const hasGitHub = hasGitHubAccount || hasGitHubInstallations;

  const data: SessionUserInfo = {
    user: session.user,
    authProvider: session.authProvider,
    hasGitHub,
    hasGitHubAccount,
    hasGitHubInstallations,
  };

  return Response.json(data);
}
