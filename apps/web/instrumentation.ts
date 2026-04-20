/**
 * Next.js server instrumentation — runs once at server startup, before any
 * route module (including @vercel/sandbox) is imported.
 *
 * We alias `VERCEL_ACCESS_TOKEN` / `VERCEL_API_TOKEN` to `VERCEL_TOKEN` here
 * because the @vercel/sandbox SDK only recognizes the `VERCEL_TOKEN` name.
 * Doing it at module import time inside the sandbox wrapper is too late: the
 * SDK may have already initialized its auth state.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const hasToken =
    !!process.env.VERCEL_TOKEN && process.env.VERCEL_TOKEN.trim() !== "";
  if (!hasToken) {
    const fallback =
      process.env.VERCEL_ACCESS_TOKEN ?? process.env.VERCEL_API_TOKEN;
    if (fallback && fallback.trim() !== "") {
      process.env.VERCEL_TOKEN = fallback;
      console.log(
        "[instrumentation] Aliased VERCEL_ACCESS_TOKEN → VERCEL_TOKEN for @vercel/sandbox SDK.",
      );
    } else {
      console.warn(
        "[instrumentation] No VERCEL_TOKEN / VERCEL_ACCESS_TOKEN set; @vercel/sandbox will fall back to device-flow auth.",
      );
    }
  }

  const team = process.env.VERCEL_TEAM_ID;
  const project = process.env.VERCEL_PROJECT_ID;
  console.log(
    `[instrumentation] Vercel Sandbox env: token=${
      process.env.VERCEL_TOKEN ? "set" : "missing"
    } team=${team ? "set" : "missing"} project=${project ? "set" : "missing"}`,
  );
}
