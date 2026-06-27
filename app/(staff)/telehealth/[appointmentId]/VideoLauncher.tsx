"use client";

import { useState } from "react";

export default function VideoLauncher({
  room,
  patientLink,
}: {
  room: string;
  patientLink: string;
}) {
  const meetUrl = `https://meet.jit.si/${room}`;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(patientLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
      <a
        className="btn"
        href={meetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none" }}
      >
        Start video call
      </a>
      <button className="btn ghost" type="button" onClick={copyLink}>
        {copied ? "Link copied" : "Copy patient link"}
      </button>
    </div>
  );
}
