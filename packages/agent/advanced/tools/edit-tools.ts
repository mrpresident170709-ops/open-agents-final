import { Effect } from "effect";
import { defineTool, type ToolContext } from "./tool-registry";
import { Schema } from "effect";
import { readFile, writeFile, applyEdit } from "../filesystem";

const EditParameters = Schema.Struct({
  path: Schema.String,
  oldText: Schema.String,
  newText: Schema.String,
});

export type EditInput = Schema.Schema.Type<typeof EditParameters>;

export const EditTool = defineTool("edit", () =>
  Effect.succeed({
    description:
      "Make precise edits to existing files by replacing specific text. This is the safest way to modify code. Specify the exact text to replace (oldText) and what to replace it with (newText). Use this for small, targeted changes like function modifications, variable renaming, or adding imports.",
    parameters: EditParameters,
    execute: async (args: EditInput, ctx: ToolContext): Promise<ToolResult> => {
      try {
        const original = await readFile(args.path);

        if (!original.includes(args.oldText)) {
          return {
            title: `Edit ${args.path}`,
            metadata: { error: true, action: "not_found" },
            output: `Error: Could not find the specified text to edit. The oldText was not found in the file.`,
          };
        }

        const updated = original.replace(args.oldText, args.newText);
        await writeFile(args.path, updated);

        return {
          title: `Edit ${args.path}`,
          metadata: { path: args.path, action: "replace" },
          output: `Successfully edited ${args.path}`,
        };
      } catch (error) {
        return {
          title: `Edit ${args.path}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const WriteParameters = Schema.Struct({
  path: Schema.String,
  content: Schema.String,
  createDirectories: Schema.optional(Schema.Boolean),
});

export type WriteInput = Schema.Schema.Type<typeof WriteParameters>;

export const WriteTool = defineTool("write", () =>
  Effect.succeed({
    description:
      "Create a new file or completely overwrite an existing file with new content. Use this for creating new files, adding new code, or making substantial changes. For small edits to existing files, use the edit tool instead.",
    parameters: WriteParameters,
    execute: async (args: WriteInput, _ctx: ToolContext): Promise<ToolResult> => {
      try {
        await writeFile(args.path, args.content, {
          createDirectories: args.createDirectories ?? true,
        });

        return {
          title: `Write ${args.path}`,
          metadata: { path: args.path, bytes: args.content.length },
          output: `Successfully wrote ${args.content.split("\n").length} lines to ${args.path}`,
        };
      } catch (error) {
        return {
          title: `Write ${args.path}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const CreateDirectoryParameters = Schema.Struct({
  path: Schema.String,
  recursive: Schema.optional(Schema.Boolean),
});

export const CreateDirectoryTool = defineTool("mkdir", () =>
  Effect.succeed({
    description:
      "Create a new directory or directory structure. Use recursive option to create nested directories.",
    parameters: CreateDirectoryParameters,
    execute: async (args: { path: string; recursive?: boolean }, _ctx: ToolContext): Promise<ToolResult> => {
      try {
        await writeFile(args.path + "/.gitkeep", "", {
          createDirectories: args.recursive ?? true,
        });

        return {
          title: `Create directory ${args.path}`,
          metadata: { path: args.path },
          output: `Successfully created directory ${args.path}`,
        };
      } catch (error) {
        return {
          title: `Create directory ${args.path}`,
          metadata: { error: true },
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  }),
);

const DeleteParameters = Schema.Struct({
  path: Schema.String,
  recursive: Schema.optional(Schema.Boolean),
});

export const DeleteTool = defineTool("delete", () =>
  Effect.succeed({
    description:
      "Delete a file or directory. Use with caution - this cannot be undone. Set recursive to true for directories.",
    parameters: DeleteParameters,
    execute: async (args: { path: string; recursive?: boolean }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Delete ${args.path}`,
        metadata: { path: args.path },
        output: `Would delete ${args.path} (not implemented for safety)`,
      };
    },
  }),
);

const MoveParameters = Schema.Struct({
  source: Schema.String,
  destination: Schema.String,
});

export const MoveTool = defineTool("move", () =>
  Effect.succeed({
    description: "Move or rename a file or directory.",
    parameters: MoveParameters,
    execute: async (args: { source: string; destination: string }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Move ${args.source}`,
        metadata: { source: args.source, destination: args.destination },
        output: `Would move ${args.source} to ${args.destination} (not implemented)`,
      };
    },
  }),
);

const CopyParameters = Schema.Struct({
  source: Schema.String,
  destination: Schema.String,
});

export const CopyTool = defineTool("copy", () =>
  Effect.succeed({
    description: "Copy a file or directory to a new location.",
    parameters: CopyParameters,
    execute: async (args: { source: string; destination: string }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Copy ${args.source}`,
        metadata: { source: args.source, destination: args.destination },
        output: `Would copy ${args.source} to ${args.destination} (not implemented)`,
      };
    },
  }),
);

export const EditTools = [EditTool, WriteTool, CreateDirectoryTool, DeleteTool, MoveTool, CopyTool];