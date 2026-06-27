"use client";

import { useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  text: string;
  crisis?: boolean;
  disclaimer?: string;
};

type ApiReply = {
  reply?: string;
  crisis?: boolean;
  aiEnabled?: boolean;
  disclaimer?: string;
  error?: string;
};

const SUGGESTIONS = [
  "What does my care plan say?",
  "What were my latest labs?",
  "How did I sleep recently?",
];

export default function AssistantChat({ aiEnabled }: { aiEnabled: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiReply;
      if (!res.ok || json.error) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: json.error ?? "Something went wrong. Please try again.",
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: json.reply ?? "",
            crisis: json.crisis,
            disclaimer: json.disclaimer,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <div>
      {!aiEnabled && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderColor: "var(--line)",
            background: "var(--sand)",
          }}
        >
          <strong>AI chat isn't enabled yet.</strong>{" "}
          <span className="muted">
            You can still ask grounded questions about your own plan, labs, and
            wearable data below. For anything else, message your care team.
          </span>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={listRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 460,
          overflowY: "auto",
          padding: "4px 0",
        }}
      >
        {messages.length === 0 && (
          <div className="muted" style={{ fontSize: 14, padding: "8px 0" }}>
            Ask me about your own data or the clinic's library. I can't give
            dosing advice, diagnose, or change your care plan — your care team
            does that.
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {loading && (
          <div className="muted" style={{ fontSize: 14 }}>
            Thinking…
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="btn ghost"
              style={{ padding: "6px 12px", fontSize: 13 }}
              onClick={() => send(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: "flex", gap: 8, marginTop: 14 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your plan, labs, or wearables…"
          aria-label="Message the assistant"
          maxLength={2000}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--card)",
            fontSize: 15,
          }}
        />
        <button className="btn" type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        This isn't medical advice — your care team decides. Always follow your
        clinician's plan.
      </p>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  if (msg.crisis) {
    // Crisis interstitial — visually distinct, never an AI answer.
    return (
      <div
        role="alert"
        className="card"
        style={{
          borderColor: "var(--berry)",
          background: "#fff5f5",
          borderWidth: 2,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--berry)",
            marginBottom: 6,
          }}
        >
          Get help now
        </div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.text}</div>
      </div>
    );
  }
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        background: isUser ? "var(--berry)" : "var(--card)",
        color: isUser ? "#fff" : "inherit",
        border: isUser ? "none" : "1px solid var(--line)",
        borderRadius: 14,
        padding: "10px 14px",
      }}
    >
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14.5 }}>
        {msg.text}
      </div>
      {msg.disclaimer && (
        <div
          className="muted"
          style={{ fontSize: 11.5, marginTop: 8, fontStyle: "italic" }}
        >
          {msg.disclaimer}
        </div>
      )}
    </div>
  );
}
