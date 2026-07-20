import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAPIError extends Error {
    status?: number;
    constructor(message: string) {
      super(message);
      this.name = "APIError";
    }
  }
  class MockAnthropic {
    messages = { create: createMock };
    static APIError = MockAPIError;
  }
  return { default: MockAnthropic };
});

vi.mock("./tools", () => ({
  runTool: vi.fn(async () => "mock tool result"),
  toolDefinitions: [],
}));

import { runAgent } from "./agent";
import { runTool } from "./tools";

describe("runAgent", () => {
  beforeEach(() => {
    createMock.mockReset();
    (runTool as ReturnType<typeof vi.fn>).mockClear();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("stops at the max-iteration cap when the model always requests a tool", async () => {
    createMock.mockResolvedValue({
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "toolu_1",
          name: "fetch_url",
          input: { url: "https://example.com" },
        },
      ],
    });

    const { answer, trace } = await runAgent("keep fetching forever");

    // MAX_ITERATIONS is 6 in agent.ts
    expect(createMock).toHaveBeenCalledTimes(6);
    expect(trace).toHaveLength(6);
    expect(answer.toLowerCase()).toContain("maximum");
  });

  it("returns the final text answer once the model stops requesting tools", async () => {
    createMock.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Final answer here." }],
    });

    const { answer, trace } = await runAgent("a simple task");

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(trace).toHaveLength(0);
    expect(answer).toBe("Final answer here.");
  });
});
