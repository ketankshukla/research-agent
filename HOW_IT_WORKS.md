# 🔬 How This App Works

> 🤖 See also: [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) for the reasoning behind *how this was built*, step by step.

This document explains, end to end, how a single research task turns into a plan, a human approval checkpoint, a tool-use loop against a real web page, and a final grounded answer.

## 🧠 The short answer (explained like you're 5)

Imagine asking a smart research assistant to read something for you. Before they start, they tell you *how* they're going to approach it — "first I'll open the page, then I'll pull out the key points, then I'll summarize." You get to say "yes, go ahead" or "no, stop." Only then do they actually open the page (using a pair of scissors-and-tape tool called `fetch_url` to clip out the readable text) and write you a summary, showing you exactly which page they opened along the way.

The "planning" and the "doing" are two **separate** requests to Claude, on purpose — so nothing happens to a real URL until a human has said yes.

## ❓ Why plan and execute are separate calls

`planTask` (`src/lib/agent.ts`) makes a Claude call **with no `tools` parameter at all**. Claude can't fetch anything in that call even if it wanted to — it can only describe, in prose, how it *would* approach the task. This isn't a UI trick layered on top of a single all-knowing call; it's a structurally separate, side-effect-free request. Only after a human clicks **Approve & Run** does `runAgent` make a *second*, independent call — this time *with* `tools` — that can actually execute `fetch_url`.

## 🔁 Full request flow, end to end

```
┌─────────────┐   1. type task, click "Plan"
│   Browser   │─────────────────────────────────┐
│ (page.tsx)  │                                  ▼
└─────────────┘                     ┌─────────────────────────┐
      ▲                             │ POST /api/plan           │
      │ 2. plan text rendered       │ (route.ts)                │
      │                             └─────────────────────────┘
      │                                          │ 3. planTask(task)
      │                                          ▼
      │                             ┌─────────────────────────┐
      │                             │ Anthropic API (Claude)   │
      │                             │ NO tools passed           │
      │                             │ returns prose plan only  │
      │                             └─────────────────────────┘
      │
      │   4. human reviews plan, clicks "Approve & Run"
      ▼
┌─────────────┐
│   Browser   │─────────────────────────────────┐
└─────────────┘                                  ▼
      ▲                             ┌─────────────────────────┐
      │ 9. trace + final answer     │ POST /api/run             │
      │    rendered                 │ (route.ts)                │
      │                             └─────────────────────────┘
      │                                          │ 5. runAgent(task)
      │                                          ▼
      │                             ┌─────────────────────────┐
      │                     ┌──────▶│ Anthropic API (Claude)   │
      │                     │       │ tools = [fetch_url]      │
      │                     │       └─────────────────────────┘
      │                     │                    │ 6. stop_reason
      │                     │                    │    === "tool_use"?
      │                     │            ┌───────┴───────┐
      │                     │          yes              no
      │                     │            │                │
      │                     │            ▼                ▼
      │                     │  ┌──────────────────┐  final `text`
      │                     │  │ runTool(name,     │  block returned
      │                     │  │ input) → fetchUrl │  as the answer
      │                     │  │ (tools.ts)        │
      │                     │  └──────────────────┘
      │                     │            │ 7. tool_result block
      │                     │            │    appended to messages
      │                     └────────────┘ 8. loop again
      │                          (capped at MAX_ITERATIONS = 6)
      └──────────────────────────────────────────┘
```

### 🪜 Step by step:

1. **You type a task and click Plan** — `src/app/page.tsx` calls `POST /api/plan` with `{ task }`.
2. **The plan route validates and calls `planTask`** — `src/app/api/plan/route.ts` checks `task` is a non-empty string, then calls `planTask(task)`.
3. **Claude plans with no tools** — `planTask` sends a system prompt ("respond with a short numbered plan... do not execute anything") and the task, with **no `tools` array**, so a tool call is not even possible here.
4. **You review and approve** — the UI renders the plan text with **Approve & Run** / **Cancel** buttons. Nothing has touched the network for the actual URL yet.
5. **Approval triggers execution** — clicking Approve calls `POST /api/run`, which calls `runAgent(task)`.
6. **The tool-use loop starts** — `runAgent` calls `messages.create({ model, tools: toolDefinitions, messages })`. If `response.stop_reason === "tool_use"`, Claude has requested one or more `tool_use` blocks (each `{ id, name, input }`).
7. **The tool actually runs, server-side** — for each `tool_use` block, `runTool(block.name, block.input)` (`src/lib/tools.ts`) dispatches to `fetchUrl`, which validates the URL, fetches it with a 10s timeout, strips `<script>`/`<style>`/`<nav>`/`<footer>` with Cheerio, and truncates the extracted text to ~6000 characters.
8. **The result is fed back** — a `{ type: "tool_result", tool_use_id, content }` block (or `is_error: true` with the error message on failure) is appended as a new `user` message, and `messages.create` is called again with the *full* running message history. This repeats until `stop_reason !== "tool_use"` **or** `MAX_ITERATIONS` (6) is reached.
9. **The final answer and trace are returned** — once Claude stops requesting tools, its final `text` block becomes `answer`, and every tool call made along the way (name, input, result/error) is returned as `trace`. The UI renders both.

## 💾 Where does the data go?

> 🚫 **Nowhere persistent.** Every step above happens per-request, in memory, inside a Vercel serverless function. Nothing is written to a database or disk — there's no session or history stored between requests.

## 🏁 Key takeaway

The plan/approve/execute split isn't cosmetic — it's enforced by which Claude calls even *have access* to tools. The planning call structurally cannot fetch a URL; only the post-approval call can, and it's capped at 6 iterations and ~6000 characters of page text per fetch specifically so a single approved task can't turn into an unbounded, slow, or expensive chain of requests.
