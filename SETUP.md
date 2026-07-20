# SETUP — Project 3: Multi-Step Research Agent

Your checklist. Build Projects 1 and 2 first. The file you hand to Windsurf is `PROMPT_3_research-agent.md`.

This one needs only your **Anthropic** key (no OpenAI).

---

## 1. Before you start (one-time)
- [ ] GitHub, Vercel, Anthropic API key — reuse from earlier projects
- [ ] Tools: node v20+, git, gh, vercel (already set up if you did Project 1)
- [ ] Logins valid: `gh auth login`, `vercel login`

---

## 2. Start the build
1. Create an empty folder `research-agent`.
2. Put `PROMPT_3_research-agent.md` in it, renamed to `PROMPT.md`.
3. Open in Windsurf; pick **Claude Opus 4.8** (best for agent reasoning); allow command execution.
4. Type:
   > Read `PROMPT.md` and complete every phase in order. Explain each step in plain language. Stop at every **⏸ PAUSE** and wait for me.

---

## 3. When the agent pauses — do the matching Action

### Action 1 — prerequisites/logins
Fix anything the Phase 0 check flags, then continue.

### Action 2 — Add your API key locally
Create `.env.local` in the project folder:
```
ANTHROPIC_API_KEY=sk-ant-...your key...
ANTHROPIC_MODEL=claude-opus-4-8
```
Save, tell the agent "done, continue." (Never commit this file.)

### Action 3 — (only if it asks) GitHub login
If the push fails, run `gh auth login`, then tell the agent to retry.

### Action 4 — Add your API key to Vercel
Add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in Vercel — via `vercel env add` (choose Production, Preview, Development) or the dashboard → Settings → Environment Variables. Then tell the agent "done" to deploy.

---

## 4. How to use the app (once it's live)
- Type a research task with a real URL, e.g.: *"Read https://example.com and give me three key takeaways."*
- The agent shows a **plan** first. Review it, then click **Approve & Run** (this is the human-in-the-loop step).
- Watch the trace (each tool call) and read the final answer.

## 5. You're done when
- The agent gives you a **live Vercel URL** where you can enter a task, approve a plan, and get an answer with a visible step trace.
- The repo `research-agent` exists with a **green Actions tab**.
- There's a `README.md`.

Send me the live URL + repo link for your resume.
