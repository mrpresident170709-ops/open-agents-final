import { Effect } from "effect";
import { defineTool, type ToolContext } from "./tool-registry";
import { Schema } from "effect";

const WebSearchParameters = Schema.Struct({
  query: Schema.String,
  numResults: Schema.optional(Schema.Number),
});

export const WebSearchTool = defineTool("websearch", () =>
  Effect.succeed({
    description:
      "Search the web for information. Use this to find documentation, StackOverflow answers, GitHub issues, tutorials, or any other information not in your codebase. Returns search results with titles and URLs.",
    parameters: WebSearchParameters,
    execute: async (args: { query: string; numResults?: number }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Web search: ${args.query}`,
        metadata: { query: args.query },
        output: `[Simulated] Would search the web for: "${args.query}"\n\nResults would include:\n- Documentation\n- StackOverflow\n- GitHub\n- Tutorials`,
      };
    },
  }),
);

const WebFetchParameters = Schema.Struct({
  url: Schema.String,
  selector: Schema.optional(Schema.String),
});

export const WebFetchTool = defineTool("webfetch", () =>
  Effect.succeed({
    description:
      "Fetch and extract content from web pages. Use this to read documentation, extract specific information from websites, or get content from APIs. You can use CSS selectors to extract specific elements from HTML pages.",
    parameters: WebFetchParameters,
    execute: async (args: { url: string; selector?: string }, _ctx: ToolContext): Promise<ToolResult> => {
      return {
        title: `Fetch ${args.url}`,
        metadata: { url: args.url, selector: args.selector },
        output: `[Simulated] Would fetch: ${args.url}\n\nWith selector: ${args.selector || "full page"}`,
      };
    },
  }),
);

export const WebTools = [WebSearchTool, WebFetchTool];