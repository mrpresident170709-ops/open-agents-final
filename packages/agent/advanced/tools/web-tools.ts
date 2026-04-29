import { defineTool, type ToolContext } from "./tool-registry";

interface WebSearchInput {
  query: string;
  numResults?: number;
}

export const WebSearchTool = defineTool("websearch", async () => ({
  description: "Search the web for information. Use this to find documentation, StackOverflow answers, GitHub issues.",
  parameters: {},
  execute: async (args: WebSearchInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Web search: ${args.query}`,
      metadata: { query: args.query },
      output: `[Simulated] Would search the web for: "${args.query}"`,
    };
  },
}));

interface WebFetchInput {
  url: string;
  selector?: string;
}

export const WebFetchTool = defineTool("webfetch", async () => ({
  description: "Fetch and extract content from web pages.",
  parameters: {},
  execute: async (args: WebFetchInput, _ctx: ToolContext): Promise<ToolResult> => {
    return {
      title: `Fetch ${args.url}`,
      metadata: { url: args.url },
      output: `[Simulated] Would fetch: ${args.url}`,
    };
  },
}));

export const WebTools = [WebSearchTool, WebFetchTool];