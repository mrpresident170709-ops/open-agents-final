/**
 * codebase_search — semantic search tool for the agent.
 *
 * Finds code by meaning rather than exact text. Uses Voyage AI embeddings
 * (voyage-code-3) to locate relevant code chunks across the workspace.
 */

import { tool } from "ai";
import { z } from "zod";
import { buildOrGetIndex, searchIndex } from "./codebase-index";
import { getSandbox } from "./utils";

export const codebaseSearchTool = () =>
  tool({
    description: `Semantic search that finds code by MEANING, not exact text.

WHEN TO USE — use this when:
- Exploring an unfamiliar codebase: "How does authentication work?"
- You know WHAT code does but not WHERE it is: "Where is email sending handled?"
- Intent search: "Where do we validate user input before saving?"
- Finding patterns: "How are API errors returned to the client?"
- Concept search: "Where is the database connection configured?"

WHEN NOT TO USE:
- You know the exact function/variable name → use grep instead
- You're looking for a file by name → use glob instead
- You need every occurrence of a specific string → use grep instead

SEARCH STRATEGY (follow this order):
1. Start BROAD — ask a complete natural-language question about intent:
   query: "How does user authentication and session management work?"
2. Review results — if they point to a specific directory, re-run scoped:
   query: "How are JWT tokens validated?", targetDirectory: "src/auth"
3. Break multi-part questions into SEPARATE focused searches — one concept per query.
   BAD:  "How does auth work and where are emails sent?"
   GOOD: Two separate calls, one per concept.

EXAMPLES:
- "Where is the payment processing logic?"
- "How are database migrations run?"
- "Where do we send emails or notifications?"
- "How is rate limiting implemented?"
- "Where are environment variables validated?"

NOTE: The first call per session builds the semantic index (5–20 seconds depending
on codebase size). All subsequent calls in the same session are fast (~1 second).`,

    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "A natural-language question about the codebase. Ask as if talking to a colleague: 'How does X work?', 'Where is Y handled?'",
        ),
      targetDirectory: z
        .string()
        .optional()
        .describe(
          "Limit search to a specific directory (e.g., 'src/auth', 'packages/api'). Omit to search the entire workspace.",
        ),
    }),

    execute: async (
      { query, targetDirectory },
      { experimental_context },
    ) => {
      const apiKey = process.env.VOYAGE_API_KEY;
      if (!apiKey) {
        return {
          success: false as const,
          error:
            "VOYAGE_API_KEY is not configured. Semantic search is unavailable. Use grep or glob for exact-text searches.",
        };
      }

      try {
        const sandbox = await getSandbox(experimental_context, "codebase_search");

        const index = await buildOrGetIndex(sandbox, apiKey);

        if (index.chunks.length === 0) {
          return {
            success: true as const,
            query,
            results: [],
            message:
              "No indexable source files found in the workspace. Use grep or glob instead.",
          };
        }

        const results = await searchIndex(query, index, apiKey, 8, targetDirectory);

        return {
          success: true as const,
          query,
          indexedFiles: index.fileCount,
          chunkCount: index.chunks.length,
          results,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false as const,
          error: `Semantic search failed: ${message}`,
        };
      }
    },
  });
