import { Effect } from "effect";
import { defineTool, type ToolContext } from "./tool-registry";
import { Schema } from "effect";

const BashParameters = Schema.Struct({
  command: Schema.String,
  timeout: Schema.optional(Schema.Number),
  cwd: Schema.optional(Schema.String),
});

export type BashInput = Schema.Schema.Type<typeof BashParameters>;

export const BashTool = defineTool("bash", () =>
  Effect.succeed({
    description:
      "Execute shell commands in the terminal. Use this to run build scripts, git commands, npm/pnpm/yarn commands, or any other command-line operations. Supports bash, sh, zsh, and PowerShell. Use timeout to prevent long-running commands from blocking.",
    parameters: BashParameters,
    execute: async (args: BashInput, ctx: ToolContext): Promise<ToolResult> => {
      try {
        if (ctx.abort.signal.aborted) {
          return {
            title: `Bash ${args.command}`,
            metadata: { aborted: true },
            output: "Command aborted",
          };
        }

        return {
          title: `Bash ${args.command}`,
          metadata: { command: args.command },
          output: `[Simulated] Would execute: ${args.command}\n\nIn production, this would execute the actual command and return its output.`,
        };
      } catch (error) {
        return {
          title: `Bash ${args.command}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const NodeParameters = Schema.Struct({
  script: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
});

export const NodeTool = defineTool("node", () =>
  Effect.succeed({
    description:
      "Run Node.js scripts and commands. Use this for running JavaScript/TypeScript code, npm scripts, or Node-based tools. Use args to pass command-line arguments to your script.",
    parameters: NodeParameters,
    execute: async (args: { script: string; args?: string[] }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Node ${args.script}`,
        metadata: { script: args.script, args: args.args },
        output: `[Simulated] Would run node ${args.script} ${args.args?.join(" ") || ""}`,
      };
    },
  }),
);

const GitParameters = Schema.Struct({
  command: Schema.String,
  path: Schema.optional(Schema.String),
});

export const GitTool = defineTool("git", () =>
  Effect.succeed({
    description:
      "Execute git commands for version control. Use this for commits, branches, diffs, status checks, and other git operations. Examples: git status, git commit -m 'message', git branch, git diff.",
    parameters: GitParameters,
    execute: async (args: { command: string; path?: string }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Git ${args.command}`,
        metadata: { command: args.command, path: args.path },
        output: `[Simulated] Would execute: git ${args.command}`,
      };
    },
  }),
);

const PnpmParameters = Schema.Struct({
  command: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
});

export const PnpmTool = defineTool("pnpm", () =>
  Effect.succeed({
    description:
      "Run pnpm package manager commands. Use this for installing dependencies, running scripts, or managing packages with pnpm. Examples: pnpm install, pnpm run dev, pnpm add package-name.",
    parameters: PnpmParameters,
    execute: async (args: { command: string; args?: string[] }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Pnpm ${args.command}`,
        metadata: { command: args.command },
        output: `[Simulated] Would execute: pnpm ${args.command} ${args.args?.join(" ") || ""}`,
      };
    },
  }),
);

export const RuntimeTools = [BashTool, NodeTool, GitTool, PnpmTool];