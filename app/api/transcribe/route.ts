import { getCurrentPractitioner } from "@/lib/auth/roles";
import { rateLimit } from "@/lib/ratelimit";
import { transcribeAudio, transcribeEnabled } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const me = await getCurrentPractitioner();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!transcribeEnabled)
    return NextResponse.json({ error: "Transcription is not configured on this server." }, { status: 503 });

  if (!(await rateLimit(`transcribe:${me.id}`, 30, 3600)))
    return NextResponse.json({ error: "Too many transcription requests. Try again later." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No audio file" }, { status: 400 });

  const blob = file as File;
  const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("ogg") ? "ogg" : "mp4";

  const text = await transcribeAudio(blob, `note.${ext}`);
  return NextResponse.json({ text });
}
