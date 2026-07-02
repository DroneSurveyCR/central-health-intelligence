import { requireStaffApi } from "@/lib/auth/roles";
import { requireModule } from "@/lib/modules/requireModule";
import { rateLimit } from "@/lib/ratelimit";
import { generateText, aiEnabled } from "@/lib/ai";
import { gatherPracticeKnowledge, practiceKnowledgeBlock } from "@/lib/ai/producers";
import { CHIRO_SYSTEM_PROMPT, REFUSAL, classifyScope } from "@/lib/chiro/knowledge";
import { NextResponse } from "next/server";

// Guardrailed chiropractic knowledge assistant. Chiro-module tenants only.
// Answers strictly from the clinic's own published articles (the chiropractic
// default library auto-seeds at provisioning, and the doctor can add/edit/
// disable individual articles from /articles) — not a hardcoded content blob,
// so it stays in sync with whatever the doctor has actually approved. Only
// answers in-scope subjects. Not a diagnosis tool. No PHI is read, so no audit entry.

export async function POST(request: Request) {
  await requireModule("chiro");
  const gate = await requireStaffApi();
  if (!gate.ok) return gate.response;
  const me = gate.practitioner;

  const { question } = (await request.json().catch(() => ({}))) as { question?: string };
  const q = String(question || "").trim();
  if (!q) return NextResponse.json({ error: "missing question" }, { status: 400 });
  if (q.length > 1000) return NextResponse.json({ error: "question too long (max 1000 chars)" }, { status: 400 });

  // Layer 1 — deterministic scope guard: fast-refuse obvious off-topic (no model call).
  if (classifyScope(q) === "out") return NextResponse.json({ inScope: false, answer: REFUSAL });

  if (!aiEnabled)
    return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
  if (!(await rateLimit(`chiro-assistant:${me.id}`, 40, 3600)))
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });

  // Grounding — the clinic's own published articles + services/products (RLS-scoped).
  const kb = await gatherPracticeKnowledge();
  const prompt = `${practiceKnowledgeBlock(kb)}

Question: ${q}

Answer using ONLY the knowledge above. If this is not a chiropractic / spine / musculoskeletal question, decline exactly as instructed.`;

  let answer: string;
  try {
    // Layer 2 — model backstop: the system prompt refuses anything off-topic the heuristic missed.
    answer = await generateText({ system: CHIRO_SYSTEM_PROMPT, prompt, maxTokens: 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed" }, { status: 502 });
  }

  const refused = answer.trim().startsWith(REFUSAL.slice(0, 40));
  return NextResponse.json({ inScope: !refused, answer: answer.trim() });
}
