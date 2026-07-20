# 🧭 Research Agent

[![CI](https://github.com/ketankshukla/research-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/ketankshukla/research-agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)
[![Deployed on Vercel](https://img.shields.io/badge/deployed-vercel-black.svg)](https://research-agent-rouge-omega.vercel.app)

✨ Give the agent a research task (e.g. *"Summarize https://example.com and list three takeaways"*). It **plans** the steps, **waits for your approval**, then **executes** with real tools via Claude's tool-use loop — showing a full step-by-step trace and a final answer.

🔗 **Live URL:** https://research-agent-rouge-omega.vercel.app

📚 **Companion docs:**
- 📖 [`USER_GUIDE.md`](./USER_GUIDE.md) — how to use the app, example tasks that work well, and troubleshooting
- 🔬 [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) — end-to-end technical deep dive into the plan → approve → tool-loop flow
- 🧠 [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) — the full step-by-step reasoning behind how this was built, plus a checklist for starting a project like this from scratch

*(📸 Screenshot placeholder — add a screenshot of the plan/approval/trace UI here.)*

## 🛠️ Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) (`@anthropic-ai/sdk`) — tool-use API
- [Cheerio](https://cheerio.js.org) for HTML-to-text extraction
- [Vitest](https://vitest.dev) for unit tests
- Vercel (via GitHub integration) for hosting, GitHub Actions for CI

## 🔍 How the agent works

1. **Plan** — `planTask` (`src/lib/agent.ts`) makes one Claude call with no tools and returns a short numbered plan.
2. **Approve** — the UI (`src/app/page.tsx`) shows the plan with **Approve & Run** / **Cancel** buttons. This is the human-in-the-loop checkpoint; nothing executes until you click Approve.
3. **Execute** — `runAgent` calls `messages.create({ tools, messages })`. When `stop_reason === "tool_use"`, it runs the matching tool server-side via `runTool` (`src/lib/tools.ts`), appends a `tool_result` block, and calls `messages.create` again — looping until `stop_reason !== "tool_use"` or the iteration cap is hit.
4. **Trace + answer** — every tool call (name, input, result/error) is recorded in the trace and rendered, followed by Claude's final `text` answer.

> 💡 For the full technical deep dive — including a request-flow diagram and exactly how the `fetch_url` tool schema round-trips through the Anthropic API — see **[HOW_IT_WORKS.md](./HOW_IT_WORKS.md)**.

### ⚙️ Model configuration

| Env var | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | — (required) |
| `ANTHROPIC_MODEL` | Model ID to use | `claude-opus-4-8` |

Cheaper alternative: `claude-sonnet-5`.

## 🛡️ Safety limits

- **Max iterations (6):** the tool-use loop is capped at `MAX_ITERATIONS = 6` in `src/lib/agent.ts` to prevent runaway loops. If the cap is hit, the app returns a clear message instead of hanging.
- **Text truncation (~6000 chars):** fetched page text is truncated in `fetchUrl` to keep requests within Vercel's serverless function limits and reduce cost/latency.
- **Human approval:** the agent never executes a task until the user explicitly clicks **Approve & Run** on the generated plan.
- **No leaked secrets:** the Anthropic API key is read only from environment variables server-side and never included in API error responses sent to the client.

## 🚀 Local setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from the template:
   ```bash
   cp .env.local.example .env.local
   ```
3. Add your real Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-opus-4-8
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000), enter a task with a real URL, review the plan, and click **Approve & Run**.

## ✅ Running tests

```bash
npm test
```

Covers: `runTool` throwing on an unknown tool name, `fetchUrl` rejecting invalid/unsupported URLs and non-200 responses without hitting the network incorrectly, HTML-to-text extraction stripping scripts/styles, and the agent loop terminating at the max-iteration cap when the model keeps requesting tools (mocked Anthropic client).

## 📦 Production build

```bash
npm run build
```

## ☁️ Deployment

Deployed on [Vercel](https://vercel.com) via its GitHub integration — every push to `master` triggers an automatic build and deploy. Environment variables (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`) are configured in the Vercel project settings, not committed to the repo.

## 📖 How I built this

This project was built phase-by-phase with an AI pair-programming agent (Windsurf/Cascade): scaffold → dependencies/env → the `fetch_url` tool → the planner + tool-use agent loop → API routes (`/api/plan`, `/api/run`) → the approval-gate UI → Vitest tests → GitHub repo + CI → Vercel deployment → docs. Each phase was run, verified, and committed individually before moving to the next.

> 🧠 Curious about the *actual reasoning* behind every one of those steps — including the snags hit (a `create-next-app` directory conflict, a TypeScript `readonly` tools-array error, a dev-server CORS/hydration issue) and how they were fixed? Read **[THOUGHT_PROCESS.md](./THOUGHT_PROCESS.md)**.
