# BUILD PROMPT — Project 3: Multi-Step Research Agent

You are a senior full-stack engineer pair-building with a developer new to agentic workflows. Build the project below end to end, from an empty folder to a live Vercel URL. The developer has a separate setup checklist; pause at the marked points and ask them to complete the numbered Setup Action.

## RULES (follow for the whole build)
- One phase at a time, in order. Run → confirm → git commit. Explain each step in plain language first.
- Never print or commit secrets. Keys in `.env.local` (git-ignored) and Vercel env vars only.
- Read config from environment variables.
- Small, reviewable diffs. Announce destructive actions.
- On failure: stop, show the error, explain, propose a fix. No silent retries.
- At every **⏸ PAUSE**, stop, name the Setup Action, and wait.

## DEFINITION OF DONE
`npm run dev` works · `npm test` passes · `npm run build` succeeds · pushed to public repo `research-agent` · CI green · deployed to Vercel with a live URL where the agent runs end to end · complete README.

## PROJECT OVERVIEW
Give the agent a research task (e.g., "Summarize https://example.com and list three takeaways"). The app: (1) **plans** the steps and shows the plan; (2) **waits for the user to approve** (human-in-the-loop); (3) **executes** using tools — primarily `fetch_url` (fetch a page, extract readable text) — via Claude's tool-use loop; (4) shows the **trace** of each step and a final answer.

## TECH STACK (use exactly this)
- Next.js (latest, App Router) + TypeScript + Tailwind CSS
- Anthropic SDK (`@anthropic-ai/sdk`) with the **tool-use API**
- `cheerio` for HTML-to-text; Vitest; Vercel; GitHub Actions

### Model configuration (exact values)
- Agent model: `process.env.ANTHROPIC_MODEL` default **`claude-opus-4-8`**. Cheaper option to note: `claude-sonnet-5`.
- If a call returns an invalid-model error, stop and tell the developer.

### How Anthropic tool use works (implement exactly like this)
- Pass `tools` to `messages.create({ tools, ... })`. Each tool: `{ name, description, input_schema }` (JSON Schema).
- A response may contain a `type: "tool_use"` block `{ id, name, input }`.
- When `stop_reason === "tool_use"`: run the tool server-side, then send a NEW user message containing a `{ type: "tool_result", tool_use_id, content }` block, and call `messages.create` again with the full running `messages` array.
- **Loop** until `stop_reason !== "tool_use"`; the final `text` block is the answer. **Cap iterations** (e.g., 6) to prevent runaways.

---

## PHASE 0 — Prerequisite check
Report node (v20+), npm, git, gh, vercel; check `gh auth status`, `vercel whoami`. Missing → **⏸ PAUSE (Setup Action 1)**.

## PHASE 1 — Scaffold
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-npm --no-import-alias
```
Confirm dev server, stop it. **Commit:** `chore: scaffold Next.js app`.

## PHASE 2 — Dependencies and environment
- `npm install @anthropic-ai/sdk cheerio` and `npm install -D vitest @vitejs/plugin-react`.
- `.env.local.example`:
  ```
  ANTHROPIC_API_KEY=your_key_here
  ANTHROPIC_MODEL=claude-opus-4-8
  ```
- Ensure `.gitignore` covers `.env*` and `.vercel`.
- **⏸ PAUSE (Setup Action 2):** developer creates `.env.local` with their real key. Wait.
- **Commit:** `chore: deps and env template`.

## PHASE 3 — Tools (pure, testable)
Create `src/lib/tools.ts`:
- `fetchUrl(url: string): Promise<string>` — validate the URL, fetch, extract readable text with cheerio (strip scripts/styles), truncate to ~6000 chars; throw a clear error on bad input or non-200.
- `toolDefinitions` — the Anthropic `tools` schema for `fetch_url` (input `{ url: string }`).
- `runTool(name, input)` — dispatcher; throws on unknown tool.
- **Commit:** `feat: fetch_url tool + dispatcher`.

## PHASE 4 — Agent loop
Create `src/lib/agent.ts`:
- `planTask(task: string): Promise<string>` — one Claude call (no tools) returning a short numbered plan.
- `runAgent(task, onStep)` — the tool-use loop above: pass `toolDefinitions`; while `stop_reason === "tool_use"`, execute via `runTool`, append `tool_result`, continue; call `onStep(step)` per step; enforce max iterations; return `{ answer, trace }`.
- **Commit:** `feat: planner + agent tool-use loop`.

## PHASE 5 — API routes
- `src/app/api/plan/route.ts` (POST `{ task }`) → `{ plan }`.
- `src/app/api/run/route.ts` (POST `{ task }`) → `{ answer, trace }`.
- Validate inputs; try/catch → 500 readable; never leak the key. **Commit:** `feat: /api/plan and /api/run`.

## PHASE 6 — UI (with the approval gate)
`src/app/page.tsx`:
1. Task input + "Plan" button → `/api/plan`, show the numbered plan.
2. **"Approve & Run"** + "Cancel" buttons — the human checkpoint; only on approval call `/api/run`.
3. Render the trace (each tool call + input + short result preview) and the final answer.
- Loading states, error handling, clean Tailwind, title + description. **Commit:** `feat: agent UI with approval gate`.

## PHASE 7 — Tests
- `vitest.config.ts` + `"test": "vitest run"`.
- `src/lib/tools.test.ts`: `runTool` throws on unknown tool; `fetchUrl` rejects an invalid URL (mock network).
- A test that the loop stops at the max-iteration cap (mock the Anthropic client to always return `tool_use`; assert termination).
- `npm test` green. **Commit:** `test: tools + loop termination`.

## PHASE 8 — Local verification
`npm run dev`: enter a task with a real URL, review the plan, approve, watch the trace, confirm a sensible answer. Try a bad URL → graceful error. `npm run build` succeeds.

## PHASE 9 — GitHub repo + push
```bash
gh repo create research-agent --public --source=. --remote=origin --push
```
Not authenticated → **⏸ PAUSE (Setup Action 3)**. Confirm repo; `.env.local` not pushed.

## PHASE 10 — CI
`.github/workflows/ci.yml`: Node 20, `npm ci`, `npm run lint`, `npm test`, `npm run build` on push/PR. Confirm green. **Commit:** `ci: workflow`.

## PHASE 11 — Deploy to Vercel
```bash
vercel link
vercel
```
- **⏸ PAUSE (Setup Action 4):** developer adds `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) to Vercel. Wait.
- Note: fetching runs in a serverless function; the max-iteration cap and text truncation keep requests within Vercel's limits.
```bash
vercel --prod
```
Open the live URL, run one real task end to end in production.

## PHASE 12 — README and finish
`README.md`: what it does, live URL, the plan → approve → tool-loop flow, how Anthropic tool use works here, the safety limits (max iterations, truncation, human approval), local setup, tests, "How I built this." Add MIT `LICENSE`. Commit, push, report Definition-of-done checklist.

---

## TROUBLESHOOTING
- **Loop never ends:** verify the max-iteration cap and that `tool_result` blocks carry the correct `tool_use_id`.
- **Invalid model:** use a current ID (`claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`).
- **Fetch blocked/timeouts:** handle non-200s gracefully; truncate large pages.
- **Vercel timeout:** reduce max iterations or page-text length; keep tools fast.
