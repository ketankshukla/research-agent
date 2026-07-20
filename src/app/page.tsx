"use client";

import { useState } from "react";
import type { TraceStep } from "@/lib/agent";

type Stage = "idle" | "planned" | "done";

export default function Home() {
  const [task, setTask] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [plan, setPlan] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlan() {
    if (!task.trim()) return;
    setError(null);
    setPlan(null);
    setAnswer(null);
    setTrace([]);
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create a plan.");
      setPlan(data.plan);
      setStage("planned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create a plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleApprove() {
    setError(null);
    setRunLoading(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run the agent.");
      setAnswer(data.answer);
      setTrace(data.trace || []);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run the agent.");
    } finally {
      setRunLoading(false);
    }
  }

  function handleCancel() {
    setStage("idle");
    setPlan(null);
    setAnswer(null);
    setTrace([]);
    setError(null);
  }

  function handleReset() {
    setTask("");
    setStage("idle");
    setPlan(null);
    setAnswer(null);
    setTrace([]);
    setError(null);
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 py-16 px-6 sm:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Research Agent
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Give the agent a research task (e.g. &ldquo;Summarize https://example.com and list
            three takeaways&rdquo;). It plans first, waits for your approval, then executes with
            tools and shows the full trace.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <label htmlFor="task" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Task
          </label>
          <textarea
            id="task"
            className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Summarize https://example.com and list three takeaways"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={stage !== "idle" || planLoading}
          />
          <div className="flex gap-3">
            <button
              onClick={handlePlan}
              disabled={!task.trim() || planLoading || stage !== "idle"}
              className="flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {planLoading ? "Planning…" : "Plan"}
            </button>
            {stage !== "idle" && (
              <button
                onClick={handleReset}
                className="flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-black transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                New task
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {plan && (
          <section className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Plan</h2>
            <pre className="whitespace-pre-wrap text-sm text-black dark:text-zinc-50">{plan}</pre>
            {stage === "planned" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={runLoading}
                  className="flex h-10 items-center justify-center rounded-full bg-green-600 px-5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runLoading ? "Running…" : "Approve & Run"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={runLoading}
                  className="flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        )}

        {trace.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Trace</h2>
            <ol className="flex flex-col gap-3">
              {trace.map((step, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="font-medium text-black dark:text-zinc-50">
                    Step {i + 1}: <code className="text-xs">{step.tool}</code>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    input: <code>{JSON.stringify(step.input)}</code>
                  </div>
                  {step.result && (
                    <div className="mt-2 text-zinc-700 dark:text-zinc-300">
                      {step.result.slice(0, 300)}
                      {step.result.length > 300 ? "…" : ""}
                    </div>
                  )}
                  {step.error && (
                    <div className="mt-2 text-red-700 dark:text-red-400">Error: {step.error}</div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {answer && (
          <section className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Answer</h2>
            <p className="whitespace-pre-wrap text-black dark:text-zinc-50">{answer}</p>
          </section>
        )}
      </main>
    </div>
  );
}
