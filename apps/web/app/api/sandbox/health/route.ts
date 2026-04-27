import { requireAuthenticatedUser } from "@/app/api/sessions/_lib/session-context";
import { getEnv } from "@/lib/env";

/**
 * GET /api/sandbox/health
 *
 * Returns a non-sensitive diagnostic of the sandbox credential configuration
 * AND performs a live read-only API call to verify the credentials actually
 * work. Visit this endpoint on the deployed app to debug sandbox failures.
 */
export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const env = getEnv();
  const isLocal = !!process.env.REPL_ID;

  const hasVercelToken = !!(
    env.VERCEL_TOKEN ||
    env.VERCEL_ACCESS_TOKEN ||
    env.VERCEL_OIDC_TOKEN
  );
  const tokenSource = env.VERCEL_TOKEN
    ? "VERCEL_TOKEN"
    : env.VERCEL_ACCESS_TOKEN
      ? "VERCEL_ACCESS_TOKEN"
      : env.VERCEL_OIDC_TOKEN
        ? "VERCEL_OIDC_TOKEN"
        : null;

  const rawToken =
    env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_OIDC_TOKEN || "";
  const hasTeamId = !!env.VERCEL_TEAM_ID;
  const hasProjectId = !!env.VERCEL_PROJECT_ID;
  const vercelConfigured = hasVercelToken && hasTeamId && hasProjectId;

  const missing: string[] = [];
  if (!isLocal) {
    if (!hasVercelToken)
      missing.push(
        "VERCEL_TOKEN (or VERCEL_ACCESS_TOKEN or VERCEL_OIDC_TOKEN)",
      );
    if (!hasTeamId) missing.push("VERCEL_TEAM_ID");
    if (!hasProjectId) missing.push("VERCEL_PROJECT_ID");
  }

  // Perform a live credential test — list sandbox sessions (read-only, 1 result)
  // so we can confirm the token/team/project combination is actually accepted
  // by the Vercel API before the user attempts real sandbox creation.
  let apiTest: {
    ok: boolean;
    status?: number;
    error?: string;
    hint?: string;
  } | null = null;

  if (!isLocal && vercelConfigured) {
    try {
      const url = new URL("https://vercel.com/api/v2/sandboxes/sessions");
      url.searchParams.set("limit", "1");
      url.searchParams.set("projectId", env.VERCEL_PROJECT_ID!);
      url.searchParams.set("teamId", env.VERCEL_TEAM_ID!);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        apiTest = { ok: true, status: res.status };
      } else {
        const body = await res.text().catch(() => "");
        let hint: string | undefined;
        if (res.status === 403) {
          hint =
            "403 Forbidden — either the token lacks sandbox permissions, the team ID is wrong, or your Vercel plan does not include Sandbox (requires Pro/Enterprise).";
        } else if (res.status === 401) {
          hint = "401 Unauthorized — VERCEL_TOKEN is invalid or expired.";
        } else if (res.status === 404) {
          hint =
            "404 Not Found — VERCEL_PROJECT_ID or VERCEL_TEAM_ID may be incorrect.";
        }
        apiTest = {
          ok: false,
          status: res.status,
          error: body.slice(0, 300) || `HTTP ${res.status}`,
          ...(hint ? { hint } : {}),
        };
      }
    } catch (err) {
      apiTest = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const config = {
    mode: isLocal ? "local" : "vercel",
    configured: isLocal || vercelConfigured,
    ...(isLocal
      ? { replId: process.env.REPL_ID }
      : {
          tokenSource,
          // show only first 8 chars to confirm the right token is loaded
          tokenPrefix: rawToken ? rawToken.slice(0, 8) + "…" : null,
          teamId: env.VERCEL_TEAM_ID ?? null,
          projectId: env.VERCEL_PROJECT_ID ?? null,
          missing: missing.length ? missing : undefined,
          apiTest,
        }),
  };

  return Response.json(config);
}
