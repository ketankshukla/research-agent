# 📖 User Guide — Research Agent

🔗 **Live app:** https://research-agent-rouge-omega.vercel.app

This guide shows you how to use the app, what kinds of tasks work well, and what to do if something goes wrong.

## 🧭 How to use it

1. Open the live URL.
2. Type a research task into the **Task** box. Include a real, publicly reachable URL if you want the agent to read a page (e.g. *"Summarize https://example.com and list three takeaways"*).
3. Click **Plan**. Claude reads the task and returns a short numbered plan — nothing runs yet.
4. Review the plan, then click **Approve & Run** to execute it, or **Cancel** to discard it and start over. This approval step is the human-in-the-loop checkpoint — the agent never fetches a URL or does anything else without it.
5. Watch the **Trace** section fill in — each tool call the agent makes (`fetch_url`), the input it used, and a preview of the result (or an error, if the fetch failed).
6. Read the **Answer** section for Claude's final response, grounded in whatever it fetched.

## ✅ Example tasks that work well

- *"Summarize https://example.com and list three takeaways."*
- *"Read https://en.wikipedia.org/wiki/Artificial_intelligence and give me a two-sentence summary."*
- *"Fetch https://news.ycombinator.com and tell me what the top story appears to be about."*

The agent works best on **public pages with real readable text content** (articles, blog posts, documentation, company sites). It uses `fetch_url` to download the page and strip out scripts/styles, so pages that are mostly JavaScript-rendered with little server-delivered text may return thin results.

## ⚠️ Example tasks that will NOT work well

- Tasks with **no URL** and no way to look one up — the agent only has one tool (`fetch_url`); it can't search the web on its own.
- URLs that are **unreachable, private, or behind a login** — you'll see a clear error in the trace instead of a summary.
- Tasks that would require **many** pages — the loop is capped at 6 tool-use iterations (see `README.md` → Safety limits), so extremely broad research tasks may hit that cap before finishing.

## 💡 Tips for best results

- Give the agent a **specific** task with a **specific** URL — vague tasks produce vague plans.
- If the trace shows a fetch error, double-check the URL is correct, public, and not behind a paywall/login.
- If the answer seems thin, the source page's readable text may have been mostly non-text content (images, embedded widgets) — try a different page.
- You can always click **Cancel** on the plan step if it doesn't look right, and adjust your task before approving.

## 🛠️ Troubleshooting

- **"Reached the maximum number of tool-use iterations..."** — the task needed more than 6 tool calls. Simplify it (e.g. one URL at a time) and try again.
- **Fetch error in the trace (non-200, timeout, invalid URL)** — the page couldn't be read. Verify the URL loads in a normal browser first.
- **Error banner instead of a plan/answer** — usually a server-side issue (e.g. a missing/invalid Anthropic API key on the deployment). Check the error text; it will not contain the actual key.
- **Nothing happens after clicking Plan/Approve & Run** — check your network connection and retry; if it persists, open the browser console for more detail.
