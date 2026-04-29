import { defineTool, type ToolContext } from "./tool-registry";

interface BashInput {
  command: string;
  timeout?: number;
  cwd?: string;
}

export const BashTool = defineTool("bash", async () => ({
  description: "Execute shell commands in the terminal. Use this to run build scripts, git commands, npm/pnpm commands.",
  parameters: {},
  execute: async (args: BashInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Bash ${args.command}`,
      metadata: { command: args.command },
      output: `[Simulated] Would execute: ${args.command}`,
    };
  },
}));

interface NodeInput {
  script: string;
  args?: string[];
}

export const NodeTool = defineTool("node", async () => ({
  description: "Run Node.js scripts and commands.",
  parameters: {},
  execute: async (args: NodeInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Node ${args.script}`,
      metadata: { script: args.script },
      output: `[Simulated] Would run: node ${args.script}`,
    };
  },
}));

interface GitInput {
  command: string;
  path?: string;
}

export const GitTool = defineTool("git", async () => ({
  description: "Execute git commands for version control.",
  parameters: {},
  execute: async (args: GitInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Git ${args.command}`,
      metadata: { command: args.command },
      output: `[Simulated] Would execute: git ${args.command}`,
    };
  },
}));

interface PnpmInput {
  command: string;
  args?: string[];
}

export const PnpmTool = defineTool("pnpm", async () => ({
  description: "Run pnpm package manager commands.",
  parameters: {},
  execute: async (args: PnpmInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Pnpm ${args.command}`,
      metadata: { command: args.command },
      output: `[Simulated] Would execute: pnpm ${args.command}`,
    };
  },
}));

export const RuntimeTools = [BashTool, NodeTool, GitTool, PnpmTool];