import { tool, type UIToolInvocation } from "ai";
import { z } from "zod";

const optionSchema = z.object({
  label: z.string().describe("1-5 words, concise choice text"),
  description: z.string().describe("Explanation of trade-offs/implications"),
});

const questionSchema = z.object({
  question: z.string().describe("The complete question to ask, ends with '?'"),
  header: z
    .string()
    .max(40)
    .transform((s) => (s.length > 24 ? s.slice(0, 24) : s))
    .describe("Short label for tab/chip display (kept to ~24 chars)"),
  options: z.array(optionSchema).min(2).max(4),
  multiSelect: z.boolean().default(false),
});

export const askUserQuestionInputSchema = z.object({
  questions: z.array(questionSchema).min(1).max(4),
});

export type AskUserQuestionInput = z.infer<typeof askUserQuestionInputSchema>;

// Output schema for the client-side tool
const answerValueSchema = z.string().or(z.array(z.string()));
const askUserQuestionOutputSchema = z
  .object({
    answers: z.record(z.string(), answerValueSchema),
  })
  .or(
    z.object({
      declined: z.literal(true),
    }),
  );

export type AskUserQuestionOutput = z.infer<typeof askUserQuestionOutputSchema>;

export const askUserQuestionTool = tool({
  description: `Ask the user a question ONLY when you are genuinely blocked and cannot proceed without their answer.

WHEN TO USE (all conditions must be true):
1. You cannot make a reasonable default decision yourself
2. Proceeding without the answer would likely produce the wrong thing entirely
3. The request is genuinely ambiguous — not just underspecified

EXAMPLES of valid use:
- Missing a required API key name that cannot be inferred from the request
- Two completely different architectures are viable and the user hasn't hinted at either
- You need a specific external URL (Spline scene, webhook endpoint) that only the user knows

NEVER use for:
- Confirming you may proceed on a clear build request ("build a document editor")
- Asking about preferences (colors, fonts, layout) — just pick sensible defaults
- Presenting a plan before building — just build
- Getting approval before touching multiple files — just touch them
- Any situation where you could make a reasonable choice yourself

DEFAULT: Do not ask. Build with sensible defaults. Only call this tool if NOT calling it would make the result useless.

USAGE NOTES:
- 1-2 questions max; never more
- Users can always select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers
- If you recommend a specific option, make it the first option and add "(Recommended)"
- Questions appear as tabs; users navigate between them before submitting`,
  inputSchema: askUserQuestionInputSchema,
  outputSchema: askUserQuestionOutputSchema,
  // NO execute function - this is a client-side tool
  toModelOutput: ({ output }) => {
    if (!output) {
      return { type: "text", value: "User did not respond to questions." };
    }

    if ("declined" in output && output.declined) {
      return {
        type: "text",
        value:
          "User declined to answer questions. You should continue without this information or ask in a different way.",
      };
    }

    if ("answers" in output) {
      const formattedAnswers = Object.entries(output.answers)
        .map(([question, answer]) => {
          const answerStr = Array.isArray(answer) ? answer.join(", ") : answer;
          return `"${question}"="${answerStr}"`;
        })
        .join(", ");

      return {
        type: "text",
        value: `User has answered your questions: ${formattedAnswers}. You can now continue with the user's answers in mind.`,
      };
    }

    return { type: "text", value: "User responded to questions." };
  },
});

export type AskUserQuestionToolUIPart = UIToolInvocation<
  typeof askUserQuestionTool
>;
