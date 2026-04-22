import { getServerSession } from "@/lib/session/get-server-session";
import {
  getUserSecrets,
  upsertUserSecret,
  deleteUserSecret,
  SECRET_ENVIRONMENTS,
  type SecretEnvironment,
} from "@/lib/db/user-secrets";

const SECRET_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;
const MAX_SECRETS = 50;
const MAX_NAME_LENGTH = 64;
const MAX_VALUE_LENGTH = 4096;

function validateName(name: unknown): name is string {
  return (
    typeof name === "string" &&
    name.length >= 1 &&
    name.length <= MAX_NAME_LENGTH &&
    SECRET_NAME_REGEX.test(name)
  );
}

function validateEnvironment(env: unknown): env is SecretEnvironment {
  return (
    typeof env === "string" &&
    (SECRET_ENVIRONMENTS as readonly string[]).includes(env)
  );
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const envParam = url.searchParams.get("environment");
  const environment = envParam && validateEnvironment(envParam) ? envParam : undefined;

  const secrets = await getUserSecrets(session.user.id, environment);
  return Response.json({ secrets });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, value, environment: envRaw } = body as Record<string, unknown>;
  const environment: SecretEnvironment = validateEnvironment(envRaw) ? envRaw : "all";

  if (!validateName(name)) {
    return Response.json(
      {
        error:
          "Invalid secret name. Must be uppercase letters, digits, and underscores (e.g. OPENAI_KEY). Max 64 chars.",
      },
      { status: 400 },
    );
  }

  if (typeof value !== "string" || value.length === 0) {
    return Response.json({ error: "Value must be a non-empty string" }, { status: 400 });
  }

  if (value.length > MAX_VALUE_LENGTH) {
    return Response.json({ error: `Value too long (max ${MAX_VALUE_LENGTH} chars)` }, { status: 400 });
  }

  // Enforce per-user limit on new secrets (not updates)
  const existing = await getUserSecrets(session.user.id);
  const isUpdate = existing.some((s) => s.name === name && s.environment === environment);
  if (!isUpdate && existing.length >= MAX_SECRETS) {
    return Response.json(
      { error: `Maximum of ${MAX_SECRETS} secrets allowed` },
      { status: 400 },
    );
  }

  let secret;
  try {
    secret = await upsertUserSecret(session.user.id, name, value, environment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save secret";
    return Response.json({ error: message }, { status: 500 });
  }
  return Response.json({ secret });
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, environment: envRaw } = (body as Record<string, unknown>) ?? {};
  const environment: SecretEnvironment = validateEnvironment(envRaw) ? envRaw : "all";

  if (!validateName(name)) {
    return Response.json({ error: "Invalid secret name" }, { status: 400 });
  }

  const deleted = await deleteUserSecret(session.user.id, name, environment);
  if (!deleted) {
    return Response.json({ error: "Secret not found" }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
