# 🧠 The Thinking Process Behind This Build

> **⚠️ Rendering note:** GitHub sanitizes custom CSS out of markdown (no forced black backgrounds or custom font sizes on github.com, for security reasons). This doc uses everything GitHub *does* support to stay legible and visually distinct: big headers, emoji, blockquote callouts, tables, and horizontal rules.

> **What this document is:** A step-by-step reconstruction of the actual reasoning used to build this app — not a tutorial, a **replay of the decisions**, including the real snags hit and how they were resolved. If you're starting a similar project from scratch, read the 🎯 section at the bottom for the generalizable checklist.

---

## 🗺️ Part 1 — How the build actually unfolded

### 🔍 Step 0 — Read everything before touching anything

**Thinking:** Both `PROMPT.md` and `SETUP.md` were read in full before running a single command. `PROMPT.md` carries the *what/how* (phases, rules, exact model names); `SETUP.md` carries the *human's side* — which pauses map to which real-world actions (logins, keys).

**Action:** Every phase in `PROMPT.md` was tracked explicitly, one phase at a time, run → confirm → commit, exactly as instructed — never batched.

---

### ⚙️ Step 1 — Phase 0: Prerequisite check

**Thinking:** Five independent, read-only checks (`node`, `npm`, `git`, `gh`, `vercel` versions, plus `gh auth status` and `vercel whoami`) don't depend on each other, so they were run together rather than one at a time.

**Result:** Everything was already installed and authenticated — no pause needed. ✅

---

### 🧱 Step 2 — Phase 1: Scaffold hits a real snag

**Snag — non-empty directory refusal:** `create-next-app` refused to scaffold because `PROMPT.md` and `SETUP.md` already existed in the target folder.

> 🛠️ **Fix:** The *minimal, reversible* fix — move both files **out** of the folder temporarily, scaffold into the now-empty directory, then move them back. Deleting and recreating them was never considered; that risks losing the original build spec for no benefit.

**Reading the framework's own warning:** The scaffold generated an `AGENTS.md` stating *"This is NOT the Next.js you know... read `node_modules/next/dist/docs/` before writing any code."* This was taken literally, not treated as boilerplate — the installed `route.md` doc was actually read before writing the API routes in Phase 5, specifically to confirm `NextRequest`/`request.json()` patterns hadn't changed in Next 16.

**Verification before committing:** The dev server was actually started, confirmed `✓ Ready`, and then stopped — not just assumed to work because the scaffold command exited `0`.

---

### 🔐 Step 3 — Phase 2: Dependencies and environment — the exact same `.gitignore` conflict as before

**Snag:** `.env.local.example` needed to be a **committed template**, but the existing `.gitignore` pattern `.env*` blocked *any* `.env`-prefixed file — including the example — from being committed. The write tool refused outright.

> 🛠️ **Fix:** Added a single negation line, `!.env*.example`, to `.gitignore`. The smallest change that satisfies both requirements at once: real secrets (`.env.local`) stay ignored, the template doesn't.

**Respecting the pause exactly as instructed:** Once the developer said `.env.local` was created, its *existence* was confirmed with `Test-Path` — its *contents* were never read or printed. "Never print or commit secrets" was treated as absolute.

---

### 🧪 Step 4 — Phase 3: The `fetch_url` tool, designed for a future you haven't reached yet

**Thinking:** `tools.ts` was written as a pure, testable module — URL validation, fetch with a timeout, Cheerio text extraction, truncation — with no dependency on the Anthropic SDK at all. Tests were still four phases away, but I/O-free, dependency-light functions are cheap to unit test later; retrofitting testability after the fact is more expensive.

---

### 🔌 Step 5 — Phase 4: The agent loop hits a TypeScript snag

**Snag:** `toolDefinitions` was written with `as const` for tight literal typing, but that made `required: readonly ["url"]` incompatible with the Anthropic SDK's `Tool.input_schema.required: string[]` (mutable) type — `tsc` failed with a "readonly cannot be assigned to mutable type" error.

> 🛠️ **Fix:** Root-caused it as an over-constrained type, not a real logic bug. Explicitly typed `toolDefinitions: Anthropic.Tool[]` instead of relying on `as const` inference — the smallest change that satisfies the SDK's actual type contract.

**Cross-checking the SDK on disk:** Rather than guessing at the `messages.create` tool-use shapes from training data, the installed `@anthropic-ai/sdk` type definitions (`ToolUseBlock`, `ToolResultBlockParam`, `MessageParam`) were grepped directly before writing `agent.ts`, consistent with the "the disk is ground truth" lesson from the Next.js docs warning.

---

### 🎨 Step 6 — Phase 5 & 6: UI, then two real bugs surfaced by the human

**Sanity check first:** After writing the API routes and UI, `npx tsc --noEmit` and `npm run build` were both run — fast feedback before assuming anything worked.

**Bug #1 — the Plan button never activated:** The developer reported typing into the task box did nothing. Reading the dev server's own terminal output (not just the browser) surfaced the real cause: `⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "127.0.0.1"` — the browser-preview proxy's origin was being rejected by Next's dev-origin allowlist, breaking the dev client's interactivity entirely, unrelated to any application code.

> 🛠️ **Fix:** Added `allowedDevOrigins: ["127.0.0.1", "localhost"]` to `next.config.ts`, per Next's own suggested fix, and restarted the dev server.

**Bug #2 — a hydration warning:** After the first fix, a hydration mismatch appeared showing a `webcrx=""` attribute injected onto `<html>` — traced to a browser extension mutating the DOM before React hydrated, not to any app code.

> 🛠️ **Fix:** Added `suppressHydrationWarning` to the `<html>` tag in `layout.tsx` — the standard, minimal fix for third-party DOM mutation, rather than trying to detect/block the extension.

Both fixes were verified by asking the developer to retest live in the browser preview before moving on — a claim of "fixed" was never made without that confirmation.

---

### ✅ Step 7 — Phase 7: Tests — a `vi.mock` hoisting snag

**Snag:** A mock class (`MockAPIError`) was declared as a top-level `const` *outside* the `vi.mock("@anthropic-ai/sdk", ...)` factory, but referenced *inside* it. Vitest hoists `vi.mock` calls above other top-level statements in the same file, so the mock factory ran before `MockAPIError` was initialized — `ReferenceError: Cannot access 'MockAPIError' before initialization`.

> 🛠️ **Fix:** Moved the class declaration *inside* the mock factory function itself, so it's created at the time the factory runs, not before.

All 7 tests (`tools.test.ts`, `agent.test.ts`) were then actually executed and the real "7 passed" output was read — not assumed — before committing.

---

### 🔬 Step 8 — Phase 8: Local verification — trust real calls over vibes

**Thinking:** Unit tests only prove the pure logic works on fake inputs. So a real task with a real URL (`metronagon.com`) was run through the live dev UI end to end — plan, approve, trace, answer — and the developer confirmed the actual returned summary made sense. A bad/unreachable URL was tested separately to confirm graceful error handling rather than a crash.

---

### 🚀 Step 9 — Phase 9 & 10: GitHub + CI, including a silent-then-not-silent workflow

**Thinking:** With `gh` already confirmed authenticated in Phase 0, the repo was created and pushed directly, no guessing needed.

**Snag — CI appeared to not trigger:** After pushing `.github/workflows/ci.yml`, `gh run list` reported **no runs** even though `gh workflow list` showed the workflow as `active`. Rather than assuming CI was broken, an empty verification commit was pushed to force a fresh push event, which *did* trigger a run — the first push (which added the workflow file itself) simply hadn't registered in time when first checked.

`gh run watch --exit-status` was used to wait for and confirm an actual green run, rather than assuming success from the push alone.

---

### ⚖️ Step 10 — Phase 11: A real conflict, surfaced instead of guessed

**The conflict:** `PROMPT.md` explicitly said to run `vercel link` / `vercel` / `vercel --prod` from the CLI. A separate standing rule said the opposite: *"Do not deploy directly to Vercel because deployment is done via GitHub."*

> 🛠️ **Resolution:** The conflict was surfaced directly, with two clear options, and the human made the call (GitHub integration). Deployment and account-level actions are exactly where guessing at intent is riskiest.

Once deployed, the *specific* Definition-of-Done requirement — "the agent runs end to end" in production — was checked precisely: the developer ran a real task with a real URL against the **live production URL**, not just a check that the homepage loaded.

---

### 📝 Step 11 — Phase 12 and beyond: Docs that match reality, not a template

**Thinking:** When asked to bring this project's docs in line with two other projects, the other projects' actual files were read first (not assumed from memory) — which surfaced that the two reference projects *disagreed* with each other on emoji style. Rather than silently picking one, the conflict was surfaced to the human, who chose the emoji-heavy style. This document itself follows that same principle: every snag described above is a real one from this actual build session, not a generic placeholder.

---

## 🎯 Part 2 — How to think about a project like this from scratch

If you were starting this yourself, here's the transferable process, stripped of this-project-specific details:

| # | Principle | Why it matters |
|---|---|---|
| 1️⃣ | **Read the entire spec before writing code.** Find the non-negotiables (secrets handling, exact versions, definition of done) first. | You can't follow a rule you haven't seen yet. |
| 2️⃣ | **Turn requirements into a checklist**, one item in progress at a time. | Makes "where am I?" always answerable, even after a break. |
| 3️⃣ | **Small, verifiable, reversible steps.** Explain → do → verify with a real check → commit → move on. | Big untested leaps are where hours get lost debugging three things at once. |
| 4️⃣ | **Distrust memorized assumptions about fast-moving tools.** Check the installed docs/source, especially if the tool warns you it changed. | Training data has a cutoff; the disk doesn't. |
| 5️⃣ | **Separate pure logic from I/O ("glue") code.** | Pure logic is cheap to unit test; glue code needs real integration checks. |
| 6️⃣ | **"Compiles" ≠ "works."** For anything hitting an external API or a browser, make a real, human-verified check before trusting it. | Type-checkers and green builds can't see runtime behavior a human eye can. |
| 7️⃣ | **Treat secrets as radioactive.** Verify presence, never read contents; keep templates and real files on opposite sides of `.gitignore`. | One accidental print of a key is one too many. |
| 8️⃣ | **When instructions conflict, stop and ask** — don't silently pick a side, especially for deployments, accounts, or spending money. | The cost of asking is one message; the cost of guessing wrong on a deploy can be much higher. |
| 9️⃣ | **Use CI as an independent second opinion**, and actually wait for the result instead of assuming a push succeeded. | Green CI catches what local shortcuts hide; "no runs found" can just mean "check again." |
| 🔟 | **Keep commits scoped to one phase/concern.** | Makes any future regression trivial to bisect. |

---

## 🔁 The one-sentence version

> **Explain the plan, do the smallest useful piece of it, verify with a real check — not a guess — commit, and repeat; and the moment two instructions disagree, ask instead of assuming.**
