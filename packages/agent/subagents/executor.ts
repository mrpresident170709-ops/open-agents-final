import type { LanguageModel } from "ai";
import { gateway, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { bashTool } from "../tools/bash";
import { critiqueCloneTool } from "../tools/critic";
import { exaFindSimilarTool, exaSearchTool } from "../tools/exa";
import {
  firecrawlMapTool,
  firecrawlScrapeTool,
  firecrawlSearchTool,
} from "../tools/firecrawl";
import { globTool } from "../tools/glob";
import { grepTool } from "../tools/grep";
import { generateImageTool } from "../tools/image-gen";
import { readFileTool } from "../tools/read";
import { generateVideoTool } from "../tools/video-gen";
import { editFileTool, writeFileTool } from "../tools/write";
import type { SandboxExecutionContext } from "../types";
import {
  SUBAGENT_BASH_RULES,
  SUBAGENT_COMPLETE_TASK_RULES,
  SUBAGENT_NO_QUESTIONS_RULES,
  SUBAGENT_REMINDER,
  SUBAGENT_RESPONSE_FORMAT,
  SUBAGENT_STEP_LIMIT,
  SUBAGENT_VALIDATE_RULES,
  SUBAGENT_WORKING_DIR,
} from "./constants";

const EXECUTOR_SYSTEM_PROMPT = `You are an executor agent - a fire-and-forget subagent that completes specific, well-defined implementation tasks autonomously.

Think of yourself as a productive engineer who cannot ask follow-up questions once started.

## CRITICAL RULES

${SUBAGENT_NO_QUESTIONS_RULES}

${SUBAGENT_COMPLETE_TASK_RULES}

${SUBAGENT_RESPONSE_FORMAT}

Example final response:
---
**Summary**: I created the new user authentication module with JWT validation. I added the auth middleware, updated the routes, and created unit tests.

**Answer**: The authentication system is now implemented:
- \`src/middleware/auth.ts\` - JWT validation middleware
- \`src/routes/auth.ts\` - Login/logout endpoints
- \`src/tests/auth.test.ts\` - Unit tests (all passing)
---

${SUBAGENT_VALIDATE_RULES}

## TOOLS
You have full access to file operations (read, write, edit, grep, glob) and bash commands.

You also have website-cloning tools — use them when your task involves
building or modifying a section that clones a real competitor website:
- \`firecrawl_search\`, \`firecrawl_map\`, \`firecrawl_scrape\` — re-scrape the
  competitor's section if you need exact CSS, copy, or HTML structure.
- \`exa_search\`, \`exa_find_similar\` — find reference assets on the open web.
- \`generate_image\` — Together AI Nano Banana 2 (\`google/flash-image-3.1\`).
  USE THIS for ANY non-trivial visual: hero illustrations, decorative
  backgrounds, abstract gradients, product mockups, photo-style imagery.
  Do NOT leave \`<div className="bg-muted h-96"/>\` placeholders where the
  competitor has rich imagery. Save into \`public/cloned-assets/\`.
- \`generate_video\` — OpenAI Sora 2. USE THIS when the competitor has an
  animated hero loop, ambient motion background, or video clip that can't be
  reproduced in CSS. Save into \`public/cloned-assets/\`.
- \`critique_clone\` — vision-model scoring of your section vs the
  competitor's section. Score must be ≥ 85 before you mark the task done.

When your task says "build the X section as a clone of <Competitor>'s X
section", treat asset procurement as part of the task — never substitute a
plain colored block for what should be a real visual.

${SUBAGENT_BASH_RULES}`;

const callOptionsSchema = z.object({
  task: z.string().describe("Short description of the task"),
  instructions: z.string().describe("Detailed instructions for the task"),
  sandbox: z
    .custom<SandboxExecutionContext["sandbox"]>()
    .describe("Sandbox for file system and shell operations"),
  model: z.custom<LanguageModel>().describe("Language model for this subagent"),
});

export type ExecutorCallOptions = z.infer<typeof callOptionsSchema>;

export const executorSubagent = new ToolLoopAgent({
  model: gateway("anthropic/claude-haiku-4.5"),
  instructions: EXECUTOR_SYSTEM_PROMPT,
  tools: {
    read: readFileTool(),
    write: writeFileTool(),
    edit: editFileTool(),
    grep: grepTool(),
    glob: globTool(),
    bash: bashTool(),
    firecrawl_search: firecrawlSearchTool,
    firecrawl_map: firecrawlMapTool,
    firecrawl_scrape: firecrawlScrapeTool,
    exa_search: exaSearchTool,
    exa_find_similar: exaFindSimilarTool,
    generate_image: generateImageTool,
    generate_video: generateVideoTool,
    critique_clone: critiqueCloneTool,
  },
  stopWhen: stepCountIs(SUBAGENT_STEP_LIMIT),
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => {
    if (!options) {
      throw new Error("Executor subagent requires task call options.");
    }

    const sandbox = options.sandbox;
    const model = options.model ?? settings.model;
    return {
      ...settings,
      model,
      instructions: `${EXECUTOR_SYSTEM_PROMPT}

${SUBAGENT_WORKING_DIR}

## Your Task
${options.task}

## Detailed Instructions
${options.instructions}

${SUBAGENT_REMINDER}`,
      experimental_context: {
        sandbox,
        model,
      },
    };
  },
});
