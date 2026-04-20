import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getChatSummariesBySessionId } from "@/lib/db/sessions";
import { getSessionByIdCached } from "@/lib/db/sessions-cache";
import { getUserPreferences } from "@/lib/db/user-preferences";
import { sanitizeUserPreferencesForSession } from "@/lib/model-access";
import { getServerSession } from "@/lib/session/get-server-session";
import { SessionLayoutShell } from "./session-layout-shell";

// Mirror of the chat page's retry policy: with Neon serverless, the very next
// read after a POST /api/sessions can land on a pooled connection that hasn't
// seen the INSERT yet. Retry briefly so we don't 404 immediately after create.
const SESSION_FETCH_RETRY_ATTEMPTS = 8;
const SESSION_FETCH_RETRY_DELAY_MS = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function getSessionByIdWithRetry(sessionId: string) {
  for (let attempt = 1; attempt <= SESSION_FETCH_RETRY_ATTEMPTS; attempt++) {
    const record = await getSessionByIdCached(sessionId);
    if (record) return record;
    if (attempt < SESSION_FETCH_RETRY_ATTEMPTS) {
      await sleep(SESSION_FETCH_RETRY_DELAY_MS);
    }
  }
  return undefined;
}

interface SessionLayoutProps {
  params: Promise<{ sessionId: string }>;
  children: ReactNode;
}

export default async function SessionLayout({
  params,
  children,
}: SessionLayoutProps) {
  const { sessionId } = await params;

  const sessionPromise = getServerSession();
  const sessionRecordPromise = getSessionByIdWithRetry(sessionId);

  const session = await sessionPromise;
  if (!session?.user) {
    redirect("/");
  }

  const sessionRecord = await sessionRecordPromise;
  if (!sessionRecord) {
    notFound();
  }

  if (sessionRecord.userId !== session.user.id) {
    redirect("/");
  }

  let initialChatsData:
    | {
        chats: Awaited<ReturnType<typeof getChatSummariesBySessionId>>;
        defaultModelId: string | null;
      }
    | undefined;

  try {
    const requestHost = (await headers()).get("host") ?? "";
    const [chats, rawPreferences] = await Promise.all([
      getChatSummariesBySessionId(sessionId, session.user.id),
      getUserPreferences(session.user.id),
    ]);
    const preferences = sanitizeUserPreferencesForSession(
      rawPreferences,
      session,
      requestHost,
    );
    initialChatsData = {
      chats,
      defaultModelId: preferences.defaultModelId,
    };
  } catch (error) {
    console.error("Failed to prefetch session chat data:", error);
  }

  return (
    <SessionLayoutShell
      session={sessionRecord}
      initialChatsData={initialChatsData}
    >
      {children}
    </SessionLayoutShell>
  );
}
