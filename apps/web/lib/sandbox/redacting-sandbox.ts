import type { Sandbox, ExecResult } from "@open-harness/sandbox";
import type { Redactor } from "@/lib/secret-redactor";

/**
 * Wrap a connected sandbox so that every exec() result passes through the
 * redactor before reaching the caller.
 *
 * Only `exec` is intercepted. Other methods are returned untouched (with
 * their `this` rebound to the original target so private state semantics
 * are preserved through the proxy).
 *
 * Why not also wrap `execDetached`? That method returns `{ commandId }`
 * synchronously without any stdout/stderr — its output (if streamed later)
 * doesn't flow through this layer. If we ever surface detached-process
 * output to the agent, we'll need to add redaction at that ingestion point.
 *
 * Why not redact `readFile()`? That tool is meant for inspecting source
 * files the user wrote; redacting it would mask `.env.example` placeholders
 * or hardcoded test fixtures. exec() is where untrusted runtime output
 * flows, and that's where redaction matters.
 */
export function wrapSandboxWithRedaction(
  sandbox: Sandbox,
  redactor: Redactor,
): Sandbox {
  const originalExec = sandbox.exec.bind(sandbox);

  const wrappedExec: Sandbox["exec"] = async (command, cwd, timeoutMs, options) => {
    const result: ExecResult = await originalExec(command, cwd, timeoutMs, options);
    return {
      ...result,
      stdout: redactor.redact(result.stdout),
      stderr: redactor.redact(result.stderr),
    };
  };

  return new Proxy(sandbox, {
    get(target, prop, receiver) {
      if (prop === "exec") return wrappedExec;
      const value = Reflect.get(target, prop, receiver);
      // Bind function properties to the original target so methods that
      // depend on `this` (most of the Sandbox interface) keep their
      // instance state when invoked through the proxy.
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  });
}
