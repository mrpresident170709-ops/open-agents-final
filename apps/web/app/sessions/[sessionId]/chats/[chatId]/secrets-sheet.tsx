"use client";

import {
  Check,
  ClipboardCopy,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type SecretEntry,
  type SecretEnvironment,
  SECRET_ENVIRONMENTS,
  ENV_LABELS,
  ENV_BADGE_COLORS,
  useUserSecrets,
} from "@/hooks/use-user-secrets";

const NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

function validateName(name: string): string | null {
  if (!name) return "Name is required";
  if (name.length > 64) return "Max 64 characters";
  if (!NAME_REGEX.test(name)) return "Uppercase, numbers, underscores only";
  return null;
}

function EnvBadge({ env }: { env: SecretEnvironment }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium leading-none ${ENV_BADGE_COLORS[env]}`}
    >
      {env === "all" ? "all" : env}
    </span>
  );
}

function AddSecretRow({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, value: string, environment: SecretEnvironment) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [environment, setEnvironment] = useState<SecretEnvironment>("all");
  const [showValue, setShowValue] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (v: string) => {
    setName(v.toUpperCase());
    setNameError(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    const err = validateName(name);
    if (err) {
      setNameError(err);
      nameRef.current?.focus();
      return;
    }
    if (!value.trim()) {
      setSubmitError("Value is required");
      return;
    }
    setSaving(true);
    const result = await onAdd(name, value, environment);
    setSaving(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    onCancel();
  };

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3 space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="KEY_NAME"
            className="h-8 font-mono text-xs"
            autoComplete="off"
            autoFocus
          />
          {nameError && <p className="mt-1 text-[10px] text-destructive">{nameError}</p>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Input
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSubmitError(null);
              }}
              placeholder="Value"
              className="h-8 pr-8 font-mono text-xs"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
                if (e.key === "Escape") onCancel();
              }}
            />
            <button
              type="button"
              onClick={() => setShowValue((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
          {submitError && <p className="mt-1 text-[10px] text-destructive">{submitError}</p>}
        </div>
      </div>

      {/* Environment selector */}
      <div className="flex flex-wrap gap-1">
        {SECRET_ENVIRONMENTS.map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => setEnvironment(env)}
            className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              environment === env
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {ENV_LABELS[env]}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Add Secret"}
        </Button>
      </div>
    </div>
  );
}

function SecretRow({
  secret,
  onDelete,
}: {
  secret: SecretEntry;
  onDelete: (name: string, environment: SecretEnvironment) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [secret.name]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    await onDelete(secret.name, secret.environment);
    setDeleting(false);
  }, [onDelete, secret.name, secret.environment]);

  return (
    <div className="group flex items-center gap-2 border-b border-border px-4 py-2.5 transition-colors hover:bg-muted/40">
      <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 min-w-0 truncate font-mono text-sm font-medium">
        {secret.name}
      </span>
      <EnvBadge env={secret.environment} />
      <span className="shrink-0 tracking-widest text-xs text-muted-foreground select-none">
        ••••••
      </span>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        title="Copy name"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <ClipboardCopy className="h-3.5 w-3.5" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SecretsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { secrets, isLoading, addSecret, deleteSecret } = useUserSecrets();
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(
    async (name: string, value: string, environment: SecretEnvironment) => {
      const result = await addSecret(name, value, environment);
      return result;
    },
    [addSecret],
  );

  const handleDelete = useCallback(
    async (name: string, environment: SecretEnvironment) => {
      await deleteSecret(name, environment);
    },
    [deleteSecret],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0 sm:w-96">
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">Secrets</SheetTitle>
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setAdding(true)}
              disabled={adding}
            >
              <Plus className="h-3.5 w-3.5" />
              New Secret
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Encrypted API keys · scoped by environment · injected as env vars.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {adding && (
            <AddSecretRow
              onAdd={handleAdd}
              onCancel={() => setAdding(false)}
            />
          )}

          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))}
            </>
          )}

          {!isLoading && secrets.length === 0 && !adding && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <KeyRound className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No secrets yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Add API keys so the agent can use them in your sandbox.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-7 gap-1.5 text-xs"
                onClick={() => setAdding(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first secret
              </Button>
            </div>
          )}

          {!isLoading &&
            secrets.map((s) => (
              <SecretRow key={`${s.environment}:${s.name}`} secret={s} onDelete={handleDelete} />
            ))}
        </div>

        {!isLoading && secrets.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground">
              {secrets.length} secret{secrets.length !== 1 ? "s" : ""} · AES-256 encrypted ·
              env-scoped injection
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
