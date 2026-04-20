export async function register() {
  if (
    !process.env.VERCEL_TOKEN &&
    process.env.VERCEL_ACCESS_TOKEN
  ) {
    process.env.VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
    console.log(
      "[instrumentation] Aliased VERCEL_ACCESS_TOKEN → VERCEL_TOKEN for @vercel/sandbox SDK.",
    );
  }

  console.log(
    `[instrumentation] Vercel Sandbox env: token=${
      process.env.VERCEL_TOKEN ? "set" : "missing"
    } team=${process.env.VERCEL_TEAM_ID ? "set" : "missing"} project=${
      process.env.VERCEL_PROJECT_ID ? "set" : "missing"
    }`,
  );
}
