import { Effect } from "effect";
import { defineTool, type ToolDefinition, type ToolContext } from "./tool-registry";
import { Schema } from "effect";
import { readFile, writeFile, glob, grep, listDirectory } from "../filesystem";
import { getLanguageFromFile } from "../lsp/language";

const ReadParameters = Schema.Struct({
  path: Schema.String,
  offset: Schema.optional(Schema.Number),
  limit: Schema.optional(Schema.Number),
});

export type ReadInput = Schema.Schema.Type<typeof ReadParameters>;

export const ReadTool = defineTool("read", () =>
  Effect.succeed({
    description:
      "Read the contents of a file or directory. Use this to view existing code, configuration, or any text content. Returns the file contents with optional line numbers.",
    parameters: ReadParameters,
    execute: async (args: ReadInput, ctx: ToolContext): Promise<ToolResult> => {
      try {
        const content = await readFile(args.path, {
          offset: args.offset,
          limit: args.limit,
        });

        const lines = content.split("\n");
        const numberedContent = lines
          .map((line, i) => `${i + 1}: ${line}`)
          .join("\n");

        return {
          title: `Read ${args.path}`,
          metadata: {
            path: args.path,
            lines: lines.length,
            language: getLanguageFromFile(args.path),
          },
          output: numberedContent || "Empty file",
        };
      } catch (error) {
        return {
          title: `Read ${args.path}`,
          metadata: { error: true, path: args.path },
          output: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const GlobParameters = Schema.Struct({
  pattern: Schema.String,
  path: Schema.optional(Schema.String),
});

export type GlobInput = Schema.Schema.Type<typeof GlobParameters>;

export const GlobTool = defineTool("glob", () =>
  Effect.succeed({
    description:
      "Find files matching a glob pattern. Supports wildcards like **/*.ts, *.json, src/**/*.tsx, etc. Very useful for finding files when you don't know the exact path.",
    parameters: GlobParameters,
    execute: async (args: GlobInput, _ctx: ToolContext): Promise<ToolResult> => {
      try {
        const files = await glob(args.pattern, args.path);

        if (files.length === 0) {
          return {
            title: `Glob ${args.pattern}`,
            metadata: { pattern: args.pattern, count: 0 },
            output: "No files found matching pattern",
          };
        }

        return {
          title: `Glob ${args.pattern}`,
          metadata: { pattern: args.pattern, count: files.length },
          output: `Found ${files.length} files:\n${files.map((f) => `- ${f}`).join("\n")}`,
        };
      } catch (error) {
        return {
          title: `Glob ${args.pattern}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const GrepParameters = Schema.Struct({
  pattern: Schema.String,
  path: Schema.optional(Schema.String),
  include: Schema.optional(Schema.String),
  exclude: Schema.optional(Schema.String),
  context: Schema.optional(Schema.Number),
});

export type GrepInput = Schema.Schema.Type<typeof GrepParameters>;

export const GrepTool = defineTool("grep", () =>
  Effect.succeed({
    description:
      "Search for text patterns in files. Use regex or simple text search. Great for finding function definitions, imports, API calls, or any code patterns. Returns matching lines with file paths and line numbers.",
    parameters: GrepParameters,
    execute: async (args: GrepInput, _ctx: ToolContext): Promise<ToolResult> => {
      try {
        const results = await grep(args.pattern, {
          path: args.path,
          include: args.include,
          exclude: args.exclude,
          context: args.context ?? 2,
        });

        if (results.length === 0) {
          return {
            title: `Grep ${args.pattern}`,
            metadata: { pattern: args.pattern, count: 0 },
            output: "No matches found",
          };
        }

        const formatted = results
          .slice(0, 100)
          .map(
            (r) =>
              `${r.file}:${r.line}: ${r.content}${
                r.matches ? ` (${r.matches.length} matches)` : ""
              }`,
          )
          .join("\n");

        const truncated = results.length > 100 ? `\n... and ${results.length - 100} more` : "";

        return {
          title: `Grep ${args.pattern}`,
          metadata: { pattern: args.pattern, count: results.length },
          output: `Found ${results.length} matches:\n${formatted}${truncated}`,
        };
      } catch (error) {
        return {
          title: `Grep ${args.pattern}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const ListParameters = Schema.Struct({
  path: Schema.String,
});

export const ListTool = defineTool("list", () =>
  Effect.succeed({
    description:
      "List the contents of a directory. Shows files and subdirectories with their types and sizes. Use this to explore the project structure.",
    parameters: ListParameters,
    execute: async (args: { path: string }, _ctx: ToolContext): Promise<ToolResult> => {
      try {
        const items = await listDirectory(args.path);

        const formatted = items
          .map((item) => {
            const type = item.isDirectory ? "[DIR]" : "[FILE]";
            const size = item.size ? ` (${item.size})` : "";
            return `${type} ${item.name}${size}`;
          })
          .join("\n");

        return {
          title: `List ${args.path}`,
          metadata: { path: args.path, count: items.length },
          output: formatted || "Empty directory",
        };
      } catch (error) {
        return {
          title: `List ${args.path}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

export const FileTools = [ReadTool, GlobTool, GrepTool, ListTool];