"use client";

import { Eye, EyeOff, KeyRound, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSecrets } from "@/hooks/use-user-secrets";

const SECRET_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

function validateName(name: string): string | null {
  if (!name) return "Name is required";
  if (name.length > 64) return "Name must be 64 characters or fewer";
  if (!SECRET_NAME_REGEX.test(name))
    return "Use uppercase letters, digits, and underscores only (e.g. OPENAI_KEY)";
  return null;
}

function AddSecretForm({ onAdd }: { onAdd: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
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
    const result = await addSecret(name, value);
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
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
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
              onChange={(e) => { setValue(e.target.value); setSubmitError(null); }}
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

      {submitError && (
        <p className="text-xs text-destructive">{submitError}</p>
      )}

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
  onDelete,
}: {
  name: string;
  onDelete: (name: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setIsDeleting(true);
    await onDelete(name);
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-sm text-foreground">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">••••••••</span>
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

  const handleDelete = async (name: string) => {
    await deleteSecret(name);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secrets</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          API keys and tokens stored here are encrypted at rest and automatically injected into
          your sandbox as environment variables. The agent can use them with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">process.env.SECRET_NAME</code>{" "}
          without ever seeing the actual value.
        </p>
      </div>

      <AddSecretForm key={addKey} onAdd={() => { setAddKey((k) => k + 1); reload(); }} />

      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Stored secrets ({secrets.length})
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

        {!isLoading && !error && secrets.length === 0 && (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No secrets yet. Add your first API key above.
          </div>
        )}

        {!isLoading && secrets.map((s) => (
          <SecretRow key={s.id} name={s.name} onDelete={handleDelete} />
        ))}
      </div>

      {!isLoading && secrets.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Secret values are encrypted with AES-256-CBC and never exposed in logs or responses.
          The agent only receives the variable names, not the values.
        </p>
      )}
    </div>
  );
}
