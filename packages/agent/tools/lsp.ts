import { tool } from "ai";
import { z } from "zod";
import { getMCPClient } from "./mcp";

let lspClient: Awaited<ReturnType<typeof getMCPClient>> | null = null;

async function getOrCreateLSPClient() {
  if (lspClient) return lspClient;
  lspClient = await getMCPClient("lsp", {
    command: "npx",
    args: ["-y", "lsp-mcp-server@latest", "serve"],
  });
  return lspClient;
}

export const lspHover = tool({
  description: `Get hover information for a symbol in code. Returns type info, documentation, and inline comments.`,
  inputSchema: z.object({
    file: z.string().describe("File path (absolute or relative to workspace)"),
    line: z.number().int().min(1).describe("Line number (1-based)"),
    column: z.number().int().min(0).describe("Column number (0-based)"),
  }),
  execute: async ({ file, line, column }) => {
    try {
      const client = await getOrCreateLSPClient();
      const result = await client.callTool("lsp_hover", {
        file,
        line,
        column,
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lspDefinition = tool({
  description: `Jump to the definition of a symbol.`,
  inputSchema: z.object({
    file: z.string().describe("File path"),
    line: z.number().int().min(1).describe("Line number (1-based)"),
    column: z.number().int().min(0).describe("Column number (0-based)"),
  }),
  execute: async ({ file, line, column }) => {
    try {
      const client = await getOrCreateLSPClient();
      const result = await client.callTool("lsp_goto_definition", {
        file,
        line,
        column,
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lspReferences = tool({
  description: `Find all references to a symbol.`,
  inputSchema: z.object({
    file: z.string().describe("File path"),
    line: z.number().int().min(1).describe("Line number (1-based)"),
    column: z.number().int().min(0).describe("Column number (0-based)"),
  }),
  execute: async ({ file, line, column }) => {
    try {
      const client = await getOrCreateLSPClient();
      const result = await client.callTool("lsp_find_references", {
        file,
        line,
        column,
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lspDiagnostics = tool({
  description: `Get diagnostics/errors for a file.`,
  inputSchema: z.object({
    file: z.string().optional().describe("File to check. If omitted, checks all open files"),
  }),
  execute: async ({ file }) => {
    try {
      const client = await getOrCreateLSPClient();
      const result = await client.callTool("lsp_get_diagnostics", {
        file: file ?? "",
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lspCodeActions = tool({
  description: `Get available code actions/quick fixes for a position.`,
  inputSchema: z.object({
    file: z.string().describe("File path"),
    line: z.number().int().min(1).describe("Line number (1-based)"),
    column: z.number().int().min(0).describe("Column number (0-based)"),
  }),
  execute: async ({ file, line, column }) => {
    try {
      const client = await getOrCreateLSPClient();
      const result = await client.callTool("lsp_code_actions", {
        file,
        line,
        column,
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const lspSymbols = tool({
  description: `List all symbols (functions, classes, variables) in a file or workspace.`,
  inputSchema: z.object({
    file: z.string().optional().describe("File to list symbols from"),
    query: z.string().optional().describe("Search query for workspace symbols"),
  }),
  execute: async ({ file, query }) => {
    try {
      const client = await getOrCreateLSPClient();
      const toolName = file ? "lsp_document_symbols" : "lsp_workspace_symbols";
      const result = await client.callTool(toolName, {
        file: file ?? "",
        query: query ?? "",
      });
      return { success: true, result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});