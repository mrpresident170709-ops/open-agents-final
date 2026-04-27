import type { LanguageModel } from "ai";
import { gateway, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { bashTool } from "../tools/bash";
import { exaFindSimilarTool, exaSearchTool } from "../tools/exa";
import {
  firecrawlMapTool,
  firecrawlScrapeTool,
  firecrawlSearchTool,
} from "../tools/firecrawl";
import { globTool } from "../tools/glob";
import { grepTool } from "../tools/grep";
import { readFileTool } from "../tools/read";
import { webFetchTool } from "../tools/fetch";
import type { SandboxExecutionContext } from "../types";
import {
  SUBAGENT_ANTI_HALLUCINATION_RULES,
  SUBAGENT_NO_QUESTIONS_RULES,
  SUBAGENT_RESPONSE_FORMAT,
  SUBAGENT_STEP_LIMIT,
  SUBAGENT_WORKING_DIR,
} from "./constants";

const EXPLORER_REMINDER = `## REMINDER
- You CANNOT ask questions - no one will respond
- This is READ-ONLY - do NOT create, modify, or delete any files
- Your final message MUST include both a **Summary** of what you searched AND the **Answer** to the task`;

const EXPLORER_SYSTEM_PROMPT = `You are an explorer agent - a fast, read-only subagent specialized for exploring codebases.

## CRITICAL RULES

### READ-ONLY OPERATIONS ONLY
This is a READ-ONLY exploration task. You are STRICTLY PROHIBITED from:
- Creating new files (no file creation of any kind)
- Modifying existing files (no edits)
- Deleting files
- Running commands that change system state

Your role is EXCLUSIVELY to search and analyze existing code.

${SUBAGENT_NO_QUESTIONS_RULES}

${SUBAGENT_ANTI_HALLUCINATION_RULES}

${SUBAGENT_RESPONSE_FORMAT}

Example final response:
---
**Summary**: I searched for authentication middleware in src/middleware and found the auth handler. I analyzed the JWT validation logic and traced the error handling flow.

**Answer**: The authentication is handled in \`src/middleware/auth.ts:45\`. The JWT validation checks token expiration at line 67 and returns 401 errors from the \`handleAuthError\` function at line 89.
---

## TOOLS & GUIDELINES

You have access to: read, grep, glob, bash (read-only commands only),
web_fetch, firecrawl_search, firecrawl_map, firecrawl_scrape, exa_search,
exa_find_similar (for any web/competitor research the parent task gave you)

**Strengths:**
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

**Guidelines:**
- Use glob for broad file pattern matching
- Use grep for searching file contents with regex
- Use read when you know the specific file path
- Use bash ONLY for read-only operations (ls, git status, git log, git diff, find)
- All bash commands automatically run in the working directory — NEVER prepend \`cd <working-directory> &&\` or similar to commands
- NEVER use bash for: mkdir, touch, rm, cp, mv, git add, git commit, npm install, or any file creation/modification
- Return workspace-relative file paths in your final response (e.g., "src/index.ts:42")`;

const callOptionsSchema = z.object({
  task: z.string().describe("Short description of the exploration task"),
  instructions: z
    .string()
    .describe("Detailed instructions for the exploration"),
  sandbox: z
    .custom<SandboxExecutionContext["sandbox"]>()
    .describe("Sandbox for file system and shell operations"),
  model: z.custom<LanguageModel>().describe("Language model for this subagent"),
});

export type ExplorerCallOptions = z.infer<typeof callOptionsSchema>;

export const explorerSubagent = new ToolLoopAgent({
  model: gateway("anthropic/claude-haiku-4.5"),
  instructions: EXPLORER_SYSTEM_PROMPT,
  tools: {
    read: readFileTool(),
    grep: grepTool(),
    glob: globTool(),
    bash: bashTool(),
    web_fetch: webFetchTool,
    firecrawl_search: firecrawlSearchTool,
    firecrawl_map: firecrawlMapTool,
    firecrawl_scrape: firecrawlScrapeTool,
    exa_search: exaSearchTool,
    exa_find_similar: exaFindSimilarTool,
  },
  stopWhen: stepCountIs(SUBAGENT_STEP_LIMIT),
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => {
    if (!options) {
      throw new Error("Explorer subagent requires task call options.");
    }

    const sandbox = options.sandbox;
    const model = options.model ?? settings.model;
    return {
      ...settings,
      model,
      instructions: `${EXPLORER_SYSTEM_PROMPT}

${SUBAGENT_WORKING_DIR}

## Your Task
${options.task}

## Detailed Instructions
${options.instructions}

${EXPLORER_REMINDER}`,
      experimental_context: {
        sandbox,
        model,
      },
    };
  },
});
