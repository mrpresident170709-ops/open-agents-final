import { defineTool, type ToolContext } from "./tool-registry";

interface EditInput {
  path: string;
  oldText: string;
  newText: string;
}

export const EditTool = defineTool("edit", async () => ({
  description: "Make precise edits to existing files by replacing specific text.",
  parameters: {},
  execute: async (args: EditInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Edit ${args.path}`,
      metadata: { path: args.path },
      output: `[Simulated] Would replace text in: ${args.path}`,
    };
  },
}));

interface WriteInput {
  path: string;
  content: string;
  createDirectories?: boolean;
}

export const WriteTool = defineTool("write", async () => ({
  description: "Create a new file or completely overwrite an existing file with new content.",
  parameters: {},
  execute: async (args: WriteInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Write ${args.path}`,
      metadata: { path: args.path, bytes: args.content.length },
      output: `[Simulated] Would write ${args.content.split("\n").length} lines to ${args.path}`,
    };
  },
}));

interface CreateDirectoryInput {
  path: string;
  recursive?: boolean;
}

export const CreateDirectoryTool = defineTool("mkdir", async () => ({
  description: "Create a new directory or directory structure.",
  parameters: {},
  execute: async (args: CreateDirectoryInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Create directory ${args.path}`,
      metadata: { path: args.path },
      output: `[Simulated] Would create directory: ${args.path}`,
    };
  },
}));

interface DeleteInput {
  path: string;
  recursive?: boolean;
}

export const DeleteTool = defineTool("delete", async () => ({
  description: "Delete a file or directory.",
  parameters: {},
  execute: async (args: DeleteInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Delete ${args.path}`,
      metadata: { path: args.path },
      output: `[Simulated] Would delete: ${args.path}`,
    };
  },
}));

interface MoveInput {
  source: string;
  destination: string;
}

export const MoveTool = defineTool("move", async () => ({
  description: "Move or rename a file or directory.",
  parameters: {},
  execute: async (args: MoveInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Move ${args.source}`,
      metadata: { source: args.source, destination: args.destination },
      output: `[Simulated] Would move ${args.source} to ${args.destination}`,
    };
  },
}));

interface CopyInput {
  source: string;
  destination: string;
}

export const CopyTool = defineTool("copy", async () => ({
  description: "Copy a file or directory to a new location.",
  parameters: {},
  execute: async (args: CopyInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Copy ${args.source}`,
      metadata: { source: args.source, destination: args.destination },
      output: `[Simulated] Would copy ${args.source} to ${args.destination}`,
    };
  },
}));

export const EditTools = [EditTool, WriteTool, CreateDirectoryTool, DeleteTool, MoveTool, CopyTool];