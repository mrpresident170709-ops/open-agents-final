"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ToolRendererProps } from "@/app/lib/render-tool";
import type { ValidateEnvOutput } from "@open-harness/agent";
import { ToolLayout } from "../tool-layout";

type VarResult = ValidateEnvOutput["results"][number];

const STATUS_ICON: Record<VarResult["status"], React.ReactNode> = {
  ok: <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />,
  missing: <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />,
  bad_format: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  too_short: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  skipped: <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
};

const STATUS_LABEL: Record<VarResult["status"], string> = {
  ok: "valid",
  missing: "missing",
  bad_format: "wrong format",
  too_short: "too short",
  skipped: "not checked",
};

function VarRow({ result }: { result: VarResult }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {STATUS_ICON[result.status]}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <code className="font-mono text-xs font-medium text-foreground">
            {result.name}
          </code>
          {!result.required && (
            <span className="text-[10px] text-muted-foreground">(optional)</span>
          )}
          <span
            className={`text-xs ${
              result.status === "ok" || result.status === "skipped"
                ? "text-muted-foreground"
                : result.status === "missing"
                  ? "text-destructive"
                  : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {STATUS_LABEL[result.status]}
          </span>
        </div>
        {result.hint && result.status !== "ok" && result.status !== "skipped" && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
            {result.hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function ValidateEnvRenderer({
  part,
  state,
}: ToolRendererProps<"tool-validate_env">) {
  const output = part.state === "output-available" ? (part.output as ValidateEnvOutput | undefined) : undefined;
  const isStreaming = part.state === "input-streaming";

  const totalCount = output?.results.length ?? 0;
  const okCount = output?.results.filter((r) => r.status === "ok").length ?? 0;
  const blockerCount = output?.blockers.length ?? 0;
  const warningCount = output?.warnings.length ?? 0;

  const summary = isStreaming
    ? "Checking env vars…"
    : !output
      ? "Validating env vars…"
      : output.allValid
        ? `${okCount}/${totalCount} valid — safe to proceed`
        : blockerCount > 0
          ? `${blockerCount} blocker${blockerCount > 1 ? "s" : ""} — execution blocked`
          : `${warningCount} warning${warningCount > 1 ? "s" : ""} — proceeding with degraded features`;

  const meta = output
    ? output.allValid
      ? "Passed"
      : blockerCount > 0
        ? "Blocked"
        : "Warnings"
    : undefined;

  const expandedContent = output?.results.length ? (
    <div className="divide-y divide-border">
      {output.results.map((r) => (
        <VarRow key={r.name} result={r} />
      ))}
      {!output.allValid && output.blockers.length > 0 && (
        <p className="pt-2 text-xs text-muted-foreground">
          Fix blockers in{" "}
          <a
            href="/settings/secrets"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Settings → Secrets
          </a>{" "}
          before re-running.
        </p>
      )}
    </div>
  ) : undefined;

  return (
    <ToolLayout
      name="Env validation"
      summary={summary}
      meta={meta}
      state={state}
      expandedContent={expandedContent}
      defaultExpanded={!!output && !output.allValid}
    />
  );
}
