import { tool } from "ai";
import { z } from "zod";

export const planTool = tool({
  description: `Create a plan for complex tasks. Use for multi-step features, refactoring, or anything with 3+ changes.

USE FOR: Building features, refactoring, complex bugs
SKIP FOR: Simple 1-2 file edits, quick questions`,
  inputSchema: z.object({
    task: z.string().describe("What to accomplish"),
  }),
  execute: async ({ task }) => {
    return {
      success: true,
      goal: task,
      steps: [
        {
          id: 1,
          description: "Analyze requirements and existing code",
          files: [],
          verification: "Understand what already exists",
        },
        {
          id: 2,
          description: "Implement the solution",
          files: [],
          verification: "Code written",
        },
        {
          id: 3,
          description: "Verify (typecheck + test)",
          files: [],
          verification: "All checks pass",
        },
      ],
    };
  },
});

export const analyzeCodebaseTool = tool({
  description: `Understand the codebase before making changes. Search for similar code, patterns, and architecture.

USE FOR: Before building new features, before refactoring, to understand how things work`,
  inputSchema: z.object({
    query: z.string().describe("What to find (e.g., 'how auth works', 'API routes')"),
    scope: z
      .enum(["code", "files", "both"])
      .optional()
      .describe("Search type: code content, filenames, or both"),
  }),
  execute: async ({ query, scope = "both" }) => {
    return {
      success: true,
      message: `Use codebase_search to find: "${query}"`,
      recommendations: [
        "Use codebase_search for semantic code search",
        "Use grep for exact matches",
        "Use glob for file patterns",
      ],
    };
  },
});