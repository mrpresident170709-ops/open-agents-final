import { z } from "zod";

export const RUNTIME_TYPES = [
  "bun",
  "node",
  "python",
  "deno",
  "go",
  "ruby",
  "java",
  "rust",
] as const;
export type RuntimeType = (typeof RUNTIME_TYPES)[number];

export const PACKAGE_MANAGERS = [
  "bun",
  "npm",
  "pnpm",
  "yarn",
  "pip",
  "poetry",
  "cargo",
  "go",
  "gem",
  "gradle",
] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface DetectedEnvironment {
  runtime: RuntimeType | null;
  packageManager: PackageManager | null;
  hasLockFile: boolean;
  lockFileContent: string | null;
}

export const EnvironmentInputSchema = z.object({
  autoInstall: z
    .boolean()
    .optional()
    .default(true)
    .describe("Automatically install missing packages"),
  timeout: z
    .number()
    .optional()
    .default(180000)
    .describe("Installation timeout in ms"),
});

export type EnvironmentInput = z.infer<typeof EnvironmentInputSchema>;

export async function detectEnvironment(
  workingDir: string,
  exec: (
    command: string,
    cwd: string,
    timeoutMs: number,
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>,
): Promise<DetectedEnvironment> {
  const result: DetectedEnvironment = {
    runtime: null,
    packageManager: null,
    hasLockFile: false,
    lockFileContent: null,
  };

  const lsResult = await exec("ls -la", workingDir, 5000);
  if (lsResult.exitCode !== 0) {
    return result;
  }

  const files = lsResult.stdout;

  const lockFiles: Record<string, { manager: PackageManager; runtime: RuntimeType }> = {
    "bun.lockb": { manager: "bun", runtime: "bun" },
    "package-lock.json": { manager: "npm", runtime: "node" },
    "pnpm-lock.yaml": { manager: "pnpm", runtime: "node" },
    "yarn.lock": { manager: "yarn", runtime: "node" },
    "poetry.lock": { manager: "poetry", runtime: "python" },
    "Pipfile.lock": { manager: "pip", runtime: "python" },
    "requirements.txt": { manager: "pip", runtime: "python" },
    "Cargo.lock": { manager: "cargo", runtime: "rust" },
    "go.mod": { manager: "go", runtime: "go" },
    "Gemfile.lock": { manager: "gem", runtime: "ruby" },
    "build.gradle": { manager: "gradle", runtime: "java" },
    "package.json": { manager: "npm", runtime: "node" },
    "pyproject.toml": { manager: "poetry", runtime: "python" },
    "setup.py": { manager: "pip", runtime: "python" },
  };

  for (const [file, config] of Object.entries(lockFiles)) {
    if (files.includes(file)) {
      result.hasLockFile = true;
      result.lockFileContent = file;
      result.packageManager = config.manager;
      result.runtime = config.runtime;
      break;
    }
  }

  return result;
}

export interface InstallationCommand {
  command: string;
  description: string;
  preInstallCheck?: string;
}

export function getInstallationCommands(
  packageName: string,
  packageManager: PackageManager,
  runtime: RuntimeType,
): InstallationCommand[] {
  const commands: InstallationCommand[] = [];

  switch (packageManager) {
    case "bun":
      commands.push({
        command: `bun add ${packageName}`,
        description: "Install package with bun",
      });
      break;
    case "npm":
      commands.push({
        command: `npm install ${packageName}`,
        description: "Install package with npm",
        preInstallCheck: "npm install",
      });
      break;
    case "pnpm":
      commands.push({
        command: `pnpm add ${packageName}`,
        description: "Install package with pnpm",
        preInstallCheck: "pnpm install",
      });
      break;
    case "yarn":
      commands.push({
        command: `yarn add ${packageName}`,
        description: "Install package with yarn",
        preInstallCheck: "yarn install",
      });
      break;
    case "pip":
      commands.push({
        command: `pip install ${packageName}`,
        description: "Install package with pip",
        preInstallCheck: "pip install --upgrade pip",
      });
      commands.push({
        command: `pip install ${packageName}`,
        description: "Install for Python 3 specifically",
      });
      break;
    case "poetry":
      commands.push({
        command: `poetry add ${packageName}`,
        description: "Install package with poetry",
      });
      break;
    case "cargo":
      commands.push({
        command: `cargo add ${packageName}`,
        description: "Install crate with cargo",
      });
      break;
    case "go":
      commands.push({
        command: `go get ${packageName}`,
        description: "Install package with go get",
      });
      break;
    case "gem":
      commands.push({
        command: `gem install ${packageName}`,
        description: "Install gem with gem",
      });
      break;
    case "gradle":
      commands.push({
        command: `./gradlew dependencies --adds ${packageName}`,
        description: "Add dependency via gradle",
      });
      break;
  }

  return commands;
}

export function parseInstallError(
  stderr: string,
  packageManager: PackageManager,
): {
  missing: boolean;
  message: string;
  suggestion: string | null;
} {
  const lower = stderr.toLowerCase();

  if (
    lower.includes("command not found") ||
    lower.includes("command not found") ||
    lower.includes("not recognized")
  ) {
    return {
      missing: true,
      message: "Command not found",
      suggestion: `Install ${packageManager} first`,
    };
  }

  const moduleNotFound = lower.match(/modulenotfounderror: no module named '(.+)'/);
  if (moduleNotFound) {
    return {
      missing: true,
      message: `Python module '${moduleNotFound[1]}' not found`,
      suggestion: "Run: pip install " + moduleNotFound[1],
    };
  }

  const cannotFind = lower.match(/cannot find module ['"](.+)['"]/);
  if (cannotFind) {
    return {
      missing: true,
      message: `Module '${cannotFind[1]}' not found`,
      suggestion: "Run: npm install " + cannotFind[1],
    };
  }

  const notFoundIn = lower.match(/'(@[^/]+[^']+)' not found in dependencies/i);
  if (notFoundIn) {
    return {
      missing: true,
      message: `Package '${notFoundIn[1]}' not found`,
      suggestion: "Run: npm install " + notFoundIn[1],
    };
  }

  return {
    missing: false,
    message: stderr,
    suggestion: null,
  };
}

export const INSTALL_PATTERNS: Array<{ pattern: RegExp; manager: PackageManager | null }> = [
  { pattern: /modulenotfounderror: no module named ['"]([^'"]+)/i, manager: "pip" },
  { pattern: /cannot find module ['"]([^'"]+)/i, manager: "npm" },
  { pattern: /error[^`]+package.*not found/i, manager: "npm" },
  { pattern: /command not found:\s*(\w+)/i, manager: null },
];

export interface AutoInstallResult {
  installed: boolean;
  command: string;
  output: string;
  error?: string;
}

export async function tryAutoInstall(
  packageName: string,
  exec: (
    command: string,
    cwd: string,
    timeoutMs: number,
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>,
  detectFn: () => Promise<DetectedEnvironment>,
  timeout?: number,
): Promise<AutoInstallResult> {
  const env = await detectFn();
  const pm = env.packageManager || "npm";
  const commands = getInstallationCommands(packageName, pm, env.runtime || "node");

  let lastError = "";

  for (const cmd of commands) {
    if (cmd.preInstallCheck) {
      await exec(cmd.preInstallCheck, "", 60000);
    }

    const installTimeout = timeout || 180000;
    const installResult = await exec(cmd.command, "", installTimeout);

    if (installResult.exitCode === 0) {
      return {
        installed: true,
        command: cmd.command,
        output: installResult.stdout,
      };
    }

    lastError = installResult.stderr || installResult.stdout;
  }

  return {
    installed: false,
    command: commands[0]?.command || "npm install " + packageName,
    output: "",
    error: lastError,
  };
}