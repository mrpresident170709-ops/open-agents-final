/**
 * Convert a chat-stream error into a short, human-readable string for the
 * error banner.
 *
 * The AI SDK v5 streaming protocol surfaces upstream failures as SSE frames
 * shaped like `{"type":"error","sequence_number":N,"errorText":"..."}`. When
 * the client encounters one of these, `useChat` throws an `Error` whose
 * `.message` is the raw frame. Rendering that verbatim in the banner shows
 * a wall of JSON to the user.
 *
 * This helper:
 *  1. Tries to parse the message as JSON and extract a useful field
 *     (`errorText`, `error`, or a nested `message`).
 *  2. Strips a leading `data:` SSE prefix if present.
 *  3. Falls back to the original message (trimmed, capped) so genuine
 *     diagnostics survive.
 */
export function formatStreamError(raw: unknown): string {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : raw == null
          ? ""
          : String(raw);

  if (!message) return "Something went wrong. Please retry.";

  let candidate = message.trim();
  if (candidate.startsWith("data:")) {
    candidate = candidate.slice("data:".length).trim();
  }

  // Try JSON parse — error frames from the stream protocol arrive as JSON.
  if (candidate.startsWith("{") || candidate.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const text = extractErrorText(parsed);
      if (text) return cap(text);
    } catch {
      // not JSON — fall through
    }
  }

  return cap(candidate);
}

function extractErrorText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;

  for (const key of ["errorText", "error_text", "message", "error", "detail"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const nested = extractErrorText(v);
      if (nested) return nested;
    }
  }
  return undefined;
}

function cap(text: string, max = 320): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
