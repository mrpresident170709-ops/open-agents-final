"use client";

import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";
import type { ToolRendererProps } from "@/app/lib/render-tool";
import type { RequestSecretsInput } from "@open-harness/agent";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "../tool-layout";

function SecretNeededRow({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <code className="font-mono text-sm font-semibold text-foreground">{name}</code>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Get key
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export function RequestSecretsRenderer({
  part,
  state,
  onConfirm,
  onSkip,
}: ToolRendererProps<"tool-request_secrets"> & {
  onConfirm?: (toolCallId: string) => void;
  onSkip?: (toolCallId: string) => void;
}) {
  const input = part.input as RequestSecretsInput | undefined;
  const output = part.state === "output-available" ? part.output : undefined;

  const isWaiting = part.state === "input-available";
  const isStreaming = part.state === "input-streaming";
  const hasOutput = part.state === "output-available";

  const isConfirmed = hasOutput && output && "confirmed" in output && output.confirmed;
  const isSkipped = hasOutput && output && "skipped" in output && output.skipped;

  const secretCount = input?.secrets?.length ?? 0;

  const summary = isStreaming
    ? "Checking secrets…"
    : isWaiting
      ? `${secretCount} secret${secretCount === 1 ? "" : "s"} needed`
      : isConfirmed
        ? "Secrets added"
        : isSkipped
          ? "Skipped — added TODO guard"
          : "Secrets required";

  const meta = isWaiting ? "Action required" : isConfirmed ? "Confirmed" : isSkipped ? "Skipped" : undefined;

  const [loading, setLoading] = useState<"confirm" | "skip" | null>(null);

  const handleConfirm = useCallback(() => {
    if (!onConfirm) return;
    setLoading("confirm");
    onConfirm(part.toolCallId);
  }, [onConfirm, part.toolCallId]);

  const handleSkip = useCallback(() => {
    if (!onSkip) return;
    setLoading("skip");
    onSkip(part.toolCallId);
  }, [onSkip, part.toolCallId]);

  const expandedContent =
    isWaiting && input ? (
      <div className="space-y-3 pt-1">
        {input.reason && (
          <p className="text-sm text-muted-foreground leading-relaxed">{input.reason}</p>
        )}

        <div className="space-y-2">
          {input.secrets.map((s) => (
            <SecretNeededRow
              key={s.name}
              name={s.name}
              description={s.description}
              url={s.url}
            />
          ))}
        </div>

        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Add these in{" "}
            <a
              href="/settings/secrets"
              target="_blank"
              className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              Settings → Secrets
            </a>
            , then click <strong>I&apos;ve added them</strong> to continue.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleConfirm}
            disabled={loading !== null}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {loading === "confirm" ? "Continuing…" : "I've added them"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={handleSkip}
            disabled={loading !== null}
          >
            {loading === "skip" ? "Skipping…" : "Skip for now"}
          </Button>
        </div>
      </div>
    ) : isConfirmed && input ? (
      <div className="space-y-1.5 pt-1">
        {input.secrets.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <code className="font-mono text-sm">{s.name}</code>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <ToolLayout
      name="Secrets required"
      summary={summary}
      meta={meta}
      state={state}
      expandedContent={expandedContent ?? undefined}
      defaultExpanded={isWaiting}
    />
  );
}
