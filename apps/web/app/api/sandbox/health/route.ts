import { requireAuthenticatedUser } from "@/app/api/sessions/_lib/session-context";
import { getEnv } from "@/lib/env";

/**
 * GET /api/sandbox/health
 *
 * Returns a non-sensitive diagnostic of the sandbox credential configuration.
 * Use this endpoint on the deployed app to quickly identify why sandbox
 * creation is failing (e.g. visit /api/sandbox/health in your browser).
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

  const config = {
    mode: isLocal ? "local" : "vercel",
    configured: isLocal || vercelConfigured,
    ...(isLocal
      ? { replId: process.env.REPL_ID }
      : {
          tokenSource,
          // show only first 8 chars so you can confirm the right token is loaded
          tokenPrefix: tokenSource
            ? (
                env.VERCEL_TOKEN ||
                env.VERCEL_ACCESS_TOKEN ||
                env.VERCEL_OIDC_TOKEN ||
                ""
              ).slice(0, 8) + "…"
            : null,
          teamId: env.VERCEL_TEAM_ID ?? null,
          // VERCEL_PROJECT_ID is an auto-injected system var on Vercel — if it
          // is present, the value is shown so you can cross-check the project.
          projectId: env.VERCEL_PROJECT_ID ?? null,
          missing: missing.length ? missing : undefined,
        }),
    hint: isLocal
      ? "Running in Replit dev environment — local filesystem sandbox is active."
      : vercelConfigured
        ? "Credentials look complete. If sandboxes still fail, check Vercel Functions logs for the POST /api/sandbox route to see the raw SDK error."
        : [
            "Sandbox credentials incomplete.",
            "Option A (recommended): enable 'Compute Credentials' (OIDC) in your Vercel project settings.",
            "Option B: set VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID as env vars in Vercel.",
          ].join(" "),
  };

  return Response.json(config);
}
