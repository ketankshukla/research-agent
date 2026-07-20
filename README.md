# Research Agent

A multi-step research agent with a human-in-the-loop approval gate. Give it a task (e.g. a URL to summarize), review its plan, approve it, and watch it execute using Claude's tool-use API — with a full step-by-step trace and a final answer.

**Live app:** https://research-agent-rouge-omega.vercel.app

## What it does

1. **Plan** — Claude reads your task and returns a short numbered plan (no tools, no side effects yet).
2. **Approve** — you review the plan and click **Approve & Run** (or **Cancel**). This is the human-in-the-loop checkpoint; nothing executes without it.
3. **Execute** — Claude runs in a tool-use loop, calling the `fetch_url` tool as needed to read real web pages.
4. **Trace + answer** — every tool call (name, input, result/error) is recorded and shown, followed by Claude's final answer.

## How Anthropic tool use works here

- `src/lib/tools.ts` defines `fetch_url` as an Anthropic tool schema (`{ name, description, input_schema }`) and a `runTool` dispatcher that executes it (fetches the URL, strips `<script>`/`<style>` with cheerio, extracts text, truncates to ~6000 chars).
- `src/lib/agent.ts` calls `messages.create({ tools, messages })`. When the response's `stop_reason` is `"tool_use"`, the code runs the matching tool server-side via `runTool`, appends a `{ type: "tool_result", tool_use_id, content }` block as a new user message, and calls `messages.create` again with the full running message history.
- This repeats until `stop_reason !== "tool_use"`, at which point the model's final `text` block is returned as the answer.

## Safety limits

- **Max iterations (6):** the tool-use loop is capped at `MAX_ITERATIONS = 6` in `src/lib/agent.ts` to prevent runaway loops. If the cap is hit, the app returns a clear message instead of hanging.
- **Text truncation (~6000 chars):** fetched page text is truncated in `fetchUrl` to keep requests within Vercel's serverless function limits and reduce cost/latency.
- **Human approval:** the agent never executes a task until the user explicitly clicks **Approve & Run** on the generated plan.
- **No leaked secrets:** the Anthropic API key is read only from environment variables server-side and never included in API error responses sent to the client.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- `@anthropic-ai/sdk` (tool-use API)
- `cheerio` for HTML-to-text extraction
- Vitest for tests
- GitHub Actions for CI, Vercel (via GitHub integration) for deployment

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then add your real ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Environment variables (`.env.local`, git-ignored):

```
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-opus-4-8
```

`ANTHROPIC_MODEL` defaults to `claude-opus-4-8` if unset. A cheaper option is `claude-sonnet-5`.

## Tests

```bash
npm test
```

Covers: `runTool` throwing on an unknown tool name, `fetchUrl` rejecting invalid/unsupported URLs and non-200 responses without hitting the network incorrectly, HTML-to-text extraction stripping scripts/styles, and the agent loop terminating at the max-iteration cap when the model keeps requesting tools (mocked Anthropic client).

## Build

```bash
npm run build
```

## Deployment

Deployed to Vercel via its GitHub integration — every push to `master` triggers an automatic build and deploy. Add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) under the Vercel project's **Settings → Environment Variables**.

## How I built this

Built end to end in Windsurf, phase by phase, from an empty folder to a deployed app:
scaffold → dependencies/env → the `fetch_url` tool → the planner + tool-use agent loop → API routes (`/api/plan`, `/api/run`) → the approval-gate UI → Vitest tests → GitHub repo + CI → Vercel deployment. Each phase was run, verified, and committed separately for small, reviewable diffs.
