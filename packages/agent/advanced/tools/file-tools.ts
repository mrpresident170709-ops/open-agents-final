import { defineTool, type ToolContext } from "./tool-registry";

interface ReadInput {
  path: string;
  offset?: number;
  limit?: number;
}

export const ReadTool = defineTool("read", async () => ({
  description: "Read the contents of a file. Use this to view existing code, configuration, or any text content.",
  parameters: {},
  execute: async (args: ReadInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Read ${args.path}`,
      metadata: { path: args.path },
      output: `[Simulated] Would read file: ${args.path}`,
    };
  },
}));

interface GlobInput {
  pattern: string;
  path?: string;
}

export const GlobTool = defineTool("glob", async () => ({
  description: "Find files matching a glob pattern. Supports wildcards like **/*.ts, *.json, src/**/*.tsx.",
  parameters: {},
  execute: async (args: GlobInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Glob ${args.pattern}`,
      metadata: { pattern: args.pattern },
      output: `[Simulated] Would find files matching: ${args.pattern}`,
    };
  },
}));

interface GrepInput {
  pattern: string;
  path?: string;
  include?: string;
  exclude?: string;
  context?: number;
}

export const GrepTool = defineTool("grep", async () => ({
  description: "Search for text patterns in files. Returns matching lines with file paths and line numbers.",
  parameters: {},
  execute: async (args: GrepInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Grep ${args.pattern}`,
      metadata: { pattern: args.pattern },
      output: `[Simulated] Would search for: ${args.pattern}`,
    };
  },
}));

interface ListInput {
  path: string;
}

export const ListTool = defineTool("list", async () => ({
  description: "List the contents of a directory.",
  parameters: {},
  execute: async (args: ListInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `List ${args.path}`,
      metadata: { path: args.path },
      output: `[Simulated] Would list directory: ${args.path}`,
    };
  },
}));

export const FileTools = [ReadTool, GlobTool, GrepTool, ListTool];