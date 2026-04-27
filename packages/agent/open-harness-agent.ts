import type { SandboxState } from "@open-harness/sandbox";
import { stepCountIs, ToolLoopAgent, type ToolSet } from "ai";
import { z } from "zod";
import { addCacheControl, trimContext } from "./context-management";
import {
  type GatewayModelId,
  gateway,
  type ProviderOptionsByProvider,
} from "./models";

import type { SkillMetadata } from "./skills/types";
import { buildSystemPrompt } from "./system-prompt";
import {
  askUserQuestionTool,
  bashTool,
  codebaseSearchTool,
  codeSearchTool,
  editFileTool,
  exaFindSimilarTool,
  exaSearchTool,
  generateImageTool,
  generateVideoTool,
  globTool,
  googleFontsTool,
  grepTool,
  lspCodeActions,
  lspDefinition,
  lspDiagnostics,
  lspHover,
  lspReferences,
  lspSymbols,
  readFileTool,
  skillTool,
  taskTool,
  todoWriteTool,
  webFetchTool,
  writeFileTool,
} from "./tools";
import { doctorTool } from "./tools/doctor";
import { readFile } from "fs/promises";
import { join } from "path";

const CLAUDE_MD_FILES = ["CLAUDE.md", "claude.md", ".claude.md"];

async function loadProjectMemory(
  workingDirectory: string,
): Promise<string | null> {
  for (const filename of CLAUDE_MD_FILES) {
    try {
      const filepath = join(workingDirectory, filename);
      const content = await readFile(filepath, "utf-8");
      if (content.trim()) {
        return content.trim();
      }
    } catch {
      // File doesn't exist, try next
    }
  }
  return null;
}

export interface AgentModelSelection {
  id: GatewayModelId;
  providerOptionsOverrides?: ProviderOptionsByProvider;
}

export type OpenHarnessAgentModelInput = GatewayModelId | AgentModelSelection;

export interface AgentSandboxContext {
  state: SandboxState;
  workingDirectory: string;
  currentBranch?: string;
  environmentDetails?: string;
}

const callOptionsSchema = z.object({
  sandbox: z.custom<AgentSandboxContext>(),
  model: z.custom<OpenHarnessAgentModelInput>().optional(),
  subagentModel: z.custom<OpenHarnessAgentModelInput>().optional(),
  customInstructions: z.string().optional(),
  priorityInstructions: z.string().optional(),
  skills: z.custom<SkillMetadata[]>().optional(),
  availableSecrets: z.array(z.string()).optional(),
});

export type OpenHarnessAgentCallOptions = z.infer<typeof callOptionsSchema>;

export const defaultModelLabel = "anthropic/claude-haiku-4.5" as const;
export const defaultModel = gateway(defaultModelLabel);

function normalizeAgentModelSelection(
  selection: OpenHarnessAgentModelInput | undefined,
  fallbackId: GatewayModelId,
): AgentModelSelection {
  if (!selection) {
    return { id: fallbackId };
  }

  return typeof selection === "string" ? { id: selection } : selection;
}

const tools = {
  todo_write: todoWriteTool,
  read: readFileTool(),
  write: writeFileTool(),
  edit: editFileTool(),
  grep: grepTool(),
  glob: globTool(),
  codebase_search: codebaseSearchTool(),
  bash: bashTool(),
  task: taskTool,
  ask_user_question: askUserQuestionTool,
  skill: skillTool,
  web_fetch: webFetchTool,
  exa_search: exaSearchTool,
  exa_find_similar: exaFindSimilarTool,
  code_search: codeSearchTool,
  generate_image: generateImageTool,
  generate_video: generateVideoTool,
  get_google_fonts: googleFontsTool,
  doctor: doctorTool,
  lsp_hover: lspHover,
  lsp_definition: lspDefinition,
  lsp_references: lspReferences,
  lsp_diagnostics: lspDiagnostics,
  lsp_code_actions: lspCodeActions,
  lsp_symbols: lspSymbols,
} satisfies ToolSet;

export const openHarnessAgent = new ToolLoopAgent({
  model: defaultModel,
  instructions: buildSystemPrompt({}),
  tools,
  stopWhen: stepCountIs(1),
  callOptionsSchema,
  prepareStep: ({ messages, model, steps: _steps }) => {
    const trimmed = trimContext(messages);
    return {
      messages: addCacheControl({
        messages: trimmed,
        model,
      }),
    };
  },
  prepareCall: async ({ options, ...settings }) => {
    if (!options) {
      throw new Error("Open Harness agent requires call options with sandbox.");
    }

    const mainSelection = normalizeAgentModelSelection(
      options.model,
      defaultModelLabel,
    );
    const subagentSelection = options.subagentModel
      ? normalizeAgentModelSelection(options.subagentModel, defaultModelLabel)
      : undefined;

    const callModel = gateway(mainSelection.id, {
      providerOptionsOverrides: mainSelection.providerOptionsOverrides,
    });
    const subagentModel = subagentSelection
      ? gateway(subagentSelection.id, {
          providerOptionsOverrides: subagentSelection.providerOptionsOverrides,
        })
      : undefined;
    const customInstructions = options.customInstructions;
    const priorityInstructions = options.priorityInstructions;
    const sandbox = options.sandbox;
    const skills = options.skills ?? [];

    const projectMemory = await loadProjectMemory(sandbox.workingDirectory);
    const combinedCustomInstructions = [
      projectMemory ? `# Project Memory\n\n${projectMemory}` : null,
      customInstructions,
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const instructions = buildSystemPrompt({
      cwd: sandbox.workingDirectory,
      currentBranch: sandbox.currentBranch,
      customInstructions: combinedCustomInstructions || undefined,
      priorityInstructions,
      environmentDetails: sandbox.environmentDetails,
      skills,
      modelId: mainSelection.id,
      availableSecrets: options.availableSecrets ?? [],
    });

    return {
      ...settings,
      model: callModel,
      tools: addCacheControl({
        tools: settings.tools ?? tools,
        model: callModel,
      }),
      instructions,
      experimental_context: {
        sandbox,
        skills,
        model: callModel,
        subagentModel,
      },
    };
  },
});

export type OpenHarnessAgent = typeof openHarnessAgent;
