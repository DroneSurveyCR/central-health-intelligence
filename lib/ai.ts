// Model-agnostic AI layer. Default provider = Anthropic (Claude Haiku).
// Everything is env-gated: with no key it reports `aiEnabled = false` and callers
// degrade gracefully, so the feature lights up the moment ANTHROPIC_API_KEY is set.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export const aiEnabled = Boolean(ANTHROPIC_KEY);
export const transcribeEnabled = Boolean(process.env.TRANSCRIBE_URL);

/** One-shot text generation. Throws if AI is not configured. */
export async function generateText(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("AI is not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 900,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content?.map((b) => b.text ?? "").join("") ?? "").trim();
}

/**
 * Transcribe audio via a configurable, OpenAI-compatible endpoint
 * (works with OpenAI Whisper or a self-hosted faster-whisper server).
 * Set TRANSCRIBE_URL (e.g. https://your-box/v1/audio/transcriptions) and optional TRANSCRIBE_KEY.
 */
export async function transcribeAudio(file: Blob, filename: string): Promise<string> {
  const url = process.env.TRANSCRIBE_URL;
  if (!url) throw new Error("Transcription is not configured");
  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", process.env.TRANSCRIBE_MODEL || "whisper-1");
  const headers: Record<string, string> = {};
  if (process.env.TRANSCRIBE_KEY) headers["Authorization"] = `Bearer ${process.env.TRANSCRIBE_KEY}`;
  const res = await fetch(url, { method: "POST", headers, body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}
