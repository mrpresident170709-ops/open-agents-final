import { tool } from "ai";
import { z } from "zod";
import { getSandbox } from "./utils";
import {
  detectEnvironment,
  getInstallationCommands,
  parseInstallError,
  tryAutoInstall,
  type DetectedEnvironment,
  type PackageManager,
  type RuntimeType,
  RUNTIME_TYPES,
  PACKAGE_MANAGERS,
} from "./install";

const envInputSchema = z.object({
  dir: z
    .string()
    .optional()
    .describe("Directory to detect environment in (default: workspace root)"),
});

export const envTool = tool({
  description: `Detect the programming environment and package manager.

This tool automatically detects:
- Runtime: bun, node, python, deno, go, ruby, java, rust
- Package Manager: bun, npm, pnpm, yarn, pip, poetry, cargo, go, gem, gradle
- Lock files present in the project

This helps the agent understand what commands to use for:
- Installing packages
- Running tests
- Building the project
- Linting and typechecking

Examples:
  - Detect environment: dir: "apps/web"
  - Check python environment: dir: "backend"

After detection, use the installation commands in the description to install packages.`,
  inputSchema: envInputSchema,
  execute: async ({ dir }, { experimental_context }) => {
    const sandbox = await getSandbox(experimental_context, "env");
    const workingDir = dir
      ? sandbox.workingDirectory + "/" + dir
      : sandbox.workingDirectory;

    const lsResult = await sandbox.exec("ls -la", workingDir, 5000);
    const files = lsResult.stdout;

    const lockFiles: Record<string, { manager: PackageManager; runtime: RuntimeType }> = {
      "bun.lockb": { manager: "bun", runtime: "bun" },
      "package-lock.json": { manager: "npm", runtime: "node" },
      "pnpm-lock.yaml": { manager: "pnpm", runtime: "node" },
      "yarn.lock": { manager: "yarn", runtime: "node" },
      "poetry.lock": { manager: "poetry", runtime: "python" },
      "requirements.txt": { manager: "pip", runtime: "python" },
      "Cargo.lock": { manager: "cargo", runtime: "rust" },
      "go.mod": { manager: "go", runtime: "go" },
      "package.json": { manager: "npm", runtime: "node" },
      "pyproject.toml": { manager: "poetry", runtime: "python" },
    };

    let env: DetectedEnvironment = {
      runtime: null,
      packageManager: null,
      hasLockFile: false,
      lockFileContent: null,
    };

    for (const [file, config] of Object.entries(lockFiles)) {
      if (files.includes(file)) {
        env = {
          hasLockFile: true,
          lockFileContent: file,
          packageManager: config.manager,
          runtime: config.runtime,
        };
        break;
      }
    }

    return {
      success: true,
      environment: env,
      message: `Detected ${env.runtime || "unknown"} environment with ${
        env.packageManager || "unknown"
      } package manager`,
    };
  },
});

const installInputSchema = z.object({
  package: z.string().describe("Package name to install"),
  packageManager: z
    .enum(PACKAGE_MANAGERS)
    .optional()
    .describe("Package manager to use (auto-detected if not provided)"),
  runtime: z
    .enum(RUNTIME_TYPES)
    .optional()
    .describe("Runtime to use (auto-detected if not provided)"),
  timeout: z
    .number()
    .optional()
    .default(180000)
    .describe("Installation timeout in ms"),
});

export const installTool = tool({
  description: `Install a package in the project environment.

Automatically detects the appropriate package manager and installs the package.
Supports: npm, pnpm, yarn, bun, pip, poetry, cargo, go, gem, gradle

Examples:
  - Install npm package: package: "lodash"
  - Install python package: package: "requests", runtime: "python"
  - Install with specific manager: package: "lodash", packageManager: "pnpm"

The tool will:
1. Detect the environment if not specified
2. Install the package using the appropriate command
3. Return success/failure with output`,
  inputSchema: installInputSchema,
  execute: async (
    { package: packageName, packageManager, runtime, timeout },
    { experimental_context },
  ) => {
    const sandbox = await getSandbox(experimental_context, "install");

    let finalPm = packageManager;
    let finalRuntime = runtime;

    if (!finalPm || !finalRuntime) {
      const lsResult = await sandbox.exec("ls -la", sandbox.workingDirectory, 5000);
      const files = lsResult.stdout;

      if (files.includes("bun.lockb")) {
        finalPm = "bun";
        finalRuntime = "bun";
      } else if (files.includes("pnpm-lock.yaml")) {
        finalPm = "pnpm";
        finalRuntime = "node";
      } else if (files.includes("yarn.lock")) {
        finalPm = "yarn";
        finalRuntime = "node";
      } else if (files.includes("poetry.lock")) {
        finalPm = "poetry";
        finalRuntime = "python";
      } else if (files.includes("requirements.txt") || files.includes("pyproject.toml")) {
        finalPm = "pip";
        finalRuntime = "python";
      } else if (files.includes("Cargo.lock")) {
        finalPm = "cargo";
        finalRuntime = "rust";
      } else if (files.includes("go.mod")) {
        finalPm = "go";
        finalRuntime = "go";
      } else {
        finalPm = "npm";
        finalRuntime = "node";
      }
    }

    if (!finalPm || !finalRuntime) {
      return {
        success: false,
        error:
          "Could not detect package manager. Please specify packageManager explicitly.",
      };
    }

    let command = "";
    switch (finalPm) {
      case "bun":
        command = `bun add ${packageName}`;
        break;
      case "npm":
        command = `npm install ${packageName}`;
        break;
      case "pnpm":
        command = `pnpm add ${packageName}`;
        break;
      case "yarn":
        command = `yarn add ${packageName}`;
        break;
      case "pip":
      case "poetry":
        command = `pip install ${packageName}`;
        break;
      case "cargo":
        command = `cargo add ${packageName}`;
        break;
      case "go":
        command = `go get ${packageName}`;
        break;
      default:
        command = `npm install ${packageName}`;
    }

    const installResult = await sandbox.exec(command, sandbox.workingDirectory, timeout || 180000);

    if (installResult.exitCode === 0) {
      return {
        success: true,
        command,
        output: installResult.stdout,
        message: `Successfully installed ${packageName} using ${finalPm}`,
      };
    }

    return {
      success: false,
      command,
      error: installResult.stderr || installResult.stdout,
      message: `Failed to install ${packageName}`,
    };
  },
});

export * from "./install";
export { detectEnvironment, parseInstallError, getInstallationCommands } from "./install";
export type { DetectedEnvironment, PackageManager, RuntimeType } from "./install";
