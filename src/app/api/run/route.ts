import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const task = (body as { task?: unknown })?.task;
  if (typeof task !== "string" || task.trim().length === 0) {
    return NextResponse.json({ error: '"task" is required and must be a non-empty string.' }, { status: 400 });
  }

  try {
    const { answer, trace } = await runAgent(task.trim());
    return NextResponse.json({ answer, trace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while running the agent.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
