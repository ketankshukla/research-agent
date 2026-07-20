import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { runTool, toolDefinitions } from "./tools";

const MAX_ITERATIONS = 6;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (or Vercel env vars).");
  }
  return new Anthropic({ apiKey });
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
}

/** A single recorded step in the agent's execution trace. */
export type TraceStep = {
  type: "tool_call";
  tool: string;
  input: Record<string, unknown>;
  result?: string;
  error?: string;
};

/** Handles Anthropic API errors, surfacing a clear message for invalid-model errors. */
function explainAnthropicError(err: unknown): Error {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 404 || /model/i.test(err.message)) {
      return new Error(
        `Anthropic API error (possibly invalid model "${getModel()}"): ${err.message}`
      );
    }
    return new Error(`Anthropic API error: ${err.message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Makes one Claude call (no tools) to produce a short numbered plan for the task.
 */
export async function planTask(task: string): Promise<string> {
  const client = getClient();
  try {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 1024,
      system:
        "You are a research planning assistant. Given a task, respond with a short numbered plan (3-6 steps) describing how you would approach it. Do not execute anything, just plan. Be concise.",
      messages: [{ role: "user", content: task }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Planner returned no text content.");
    }
    return textBlock.text;
  } catch (err) {
    throw explainAnthropicError(err);
  }
}

/**
 * Runs the Claude tool-use loop for a task: the model may call `fetch_url` as many
 * times as needed (up to MAX_ITERATIONS), and each call is executed server-side via
 * `runTool`. Calls `onStep` after each tool execution. Returns the final answer and
 * the full trace of tool calls.
 */
export async function runAgent(
  task: string,
  onStep?: (step: TraceStep) => void
): Promise<{ answer: string; trace: TraceStep[] }> {
  const client = getClient();
  const model = getModel();
  const trace: TraceStep[] = [];

  const messages: MessageParam[] = [{ role: "user", content: task }];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        tools: toolDefinitions,
        messages,
      });
    } catch (err) {
      throw explainAnthropicError(err);
    }

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";
      return { answer, trace };
    }

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResultBlocks: ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const step: TraceStep = {
        type: "tool_call",
        tool: block.name,
        input: block.input as Record<string, unknown>,
      };
      try {
        const result = await runTool(block.name, block.input as Record<string, unknown>);
        step.result = result;
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        step.error = message;
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: message,
          is_error: true,
        });
      }
      trace.push(step);
      onStep?.(step);
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  return {
    answer:
      "Reached the maximum number of tool-use iterations without a final answer. Try a simpler task.",
    trace,
  };
}
