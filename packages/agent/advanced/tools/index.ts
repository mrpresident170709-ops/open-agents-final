export * from "./tool-registry";
export * from "./file-tools";
export * from "./edit-tools";
export * from "./runtime-tools";
export * from "./web-tools";

import { globalToolRegistry } from "./tool-registry";
import { FileTools } from "./file-tools";
import { EditTools } from "./edit-tools";
import { RuntimeTools } from "./runtime-tools";
import { WebTools } from "./web-tools";

export function registerAllTools(): void {
  const allTools = [...FileTools, ...EditTools, ...RuntimeTools, ...WebTools];
  
  for (const tool of allTools) {
    globalToolRegistry.register(tool.id, tool);
  }
}

export const TOOL_CATEGORIES = {
  file: {
    name: "File Operations",
    tools: ["read", "glob", "grep", "list"],
    description: "Read, search, and explore files in the codebase",
  },
  edit: {
    name: "Edit Operations",
    tools: ["edit", "write", "mkdir", "delete", "move", "copy"],
    description: "Create, modify, and manage files",
  },
  runtime: {
    name: "Runtime Operations",
    tools: ["bash", "node", "git", "pnpm"],
    description: "Execute commands and run scripts",
  },
  web: {
    name: "Web Operations",
    tools: ["websearch", "webfetch"],
    description: "Search and fetch web content",
  },
} as const;