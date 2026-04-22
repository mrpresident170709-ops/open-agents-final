"use client";

import { Eye, EyeOff, KeyRound, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUserSecrets,
  SECRET_ENVIRONMENTS,
  ENV_LABELS,
  ENV_BADGE_COLORS,
  type SecretEnvironment,
} from "@/hooks/use-user-secrets";

const SECRET_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

function validateName(name: string): string | null {
  if (!name) return "Name is required";
  if (name.length > 64) return "Name must be 64 characters or fewer";
  if (!SECRET_NAME_REGEX.test(name))
    return "Use uppercase letters, digits, and underscores only (e.g. OPENAI_KEY)";
  return null;
}

function EnvBadge({ env }: { env: SecretEnvironment }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${ENV_BADGE_COLORS[env]}`}
    >
      {env === "all" ? "all envs" : env}
    </span>
  );
}

function AddSecretForm({ onAdd }: { onAdd: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [environment, setEnvironment] = useState<SecretEnvironment>("all");
  const [showValue, setShowValue] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { addSecret } = useUserSecrets();
  const nameRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (v: string) => {
    setName(v.toUpperCase());
    setNameError(null);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateName(name);
    if (nameErr) {
      setNameError(nameErr);
      nameRef.current?.focus();
      return;
    }
    if (!value.trim()) {
      setSubmitError("Value is required");
      return;
    }
    setIsSaving(true);
    const result = await addSecret(name, value, environment);
    setIsSaving(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setName("");
    setValue("");
    setNameError(null);
    setSubmitError(null);
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Plus className="h-4 w-4" />
        Add secret
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="secret-name" className="text-xs font-medium text-muted-foreground">
            Name
          </Label>
          <Input
            id="secret-name"
            ref={nameRef}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="OPENAI_KEY"
            className="font-mono text-sm"
            autoComplete="off"
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secret-value" className="text-xs font-medium text-muted-foreground">
            Value
          </Label>
          <div className="relative">
            <Input
              id="secret-value"
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSubmitError(null);
              }}
              placeholder="sk-..."
              className="pr-9 font-mono text-sm"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowValue((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Environment</Label>
        <div className="flex flex-wrap gap-2">
          {SECRET_ENVIRONMENTS.map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvironment(env)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                environment === env
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {ENV_LABELS[env]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {environment === "all"
            ? "Available in development, preview, and production."
            : `Only injected when the app runs in ${environment} mode.`}
        </p>
      </div>

      {submitError && <p className="text-xs text-destructive">{submitError}</p>}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save secret"}
        </Button>
      </div>
    </form>
  );
}

function SecretRow({
  name,
  environment,
  onDelete,
}: {
  name: string;
  environment: SecretEnvironment;
  onDelete: (name: string, environment: SecretEnvironment) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setIsDeleting(true);
    await onDelete(name, environment);
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-sm text-foreground">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">••••••••</span>
        <EnvBadge env={environment} />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {confirming && !isDeleting && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={
            confirming
              ? "rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
              : "rounded p-1 text-muted-foreground hover:text-destructive"
          }
        >
          {isDeleting ? (
            <span className="text-xs">Deleting...</span>
          ) : confirming ? (
            "Confirm delete"
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

const ENV_FILTER_TABS: { label: string; value: SecretEnvironment | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Development", value: "development" },
  { label: "Preview", value: "preview" },
  { label: "Production", value: "production" },
];

export function SecretsSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function SecretsSection() {
  const { secrets, isLoading, error, deleteSecret, reload } = useUserSecrets();
  const [addKey, setAddKey] = useState(0);
  const [activeTab, setActiveTab] = useState<SecretEnvironment | "all">("all");

  const filteredSecrets =
    activeTab === "all" ? secrets : secrets.filter((s) => s.environment === activeTab);

  const handleDelete = async (name: string, environment: SecretEnvironment) => {
    await deleteSecret(name, environment);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secrets</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          API keys and tokens stored here are encrypted at rest and automatically injected into
          your sandbox as environment variables. Scope secrets to a specific environment so dev
          keys never reach production.
        </p>
      </div>

      <AddSecretForm key={addKey} onAdd={() => { setAddKey((k) => k + 1); reload(); }} />

      <div className="space-y-3">
        {/* Environment filter tabs */}
        <div className="flex gap-1 border-b border-border">
          {ENV_FILTER_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? secrets.length
                : secrets.filter((s) => s.environment === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`-mb-px border-b-2 px-3 pb-2 text-xs font-medium transition-colors ${
                  activeTab === tab.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredSecrets.length === 0 && (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {activeTab === "all"
              ? "No secrets yet. Add your first API key above."
              : `No secrets scoped to ${activeTab}. Add one above or switch to All Environments.`}
          </div>
        )}

        {!isLoading &&
          filteredSecrets.map((s) => (
            <SecretRow
              key={`${s.environment}:${s.name}`}
              name={s.name}
              environment={s.environment}
              onDelete={handleDelete}
            />
          ))}
      </div>

      {!isLoading && secrets.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-foreground">How environment scoping works</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">All Environments</span> — injected in every context (dev, preview, prod).
            Use for shared keys that don&apos;t change between environments.
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Environment-specific</span> — only injected when{" "}
            <code className="rounded bg-muted px-1 text-[11px] font-mono">NODE_ENV</code> or{" "}
            <code className="rounded bg-muted px-1 text-[11px] font-mono">APP_ENV</code> matches.
            Env-specific keys override All Environments keys with the same name.
          </p>
        </div>
      )}
    </div>
  );
}
