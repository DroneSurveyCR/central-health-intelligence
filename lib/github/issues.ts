// Mirror support tickets to GitHub issues so the platform team tracks + fixes
// them in the repo. Degrades gracefully: if GITHUB_TOKEN is unset, every call is
// a no-op and the in-app ticket still works. Never throws into the request path.

const REPO = process.env.GITHUB_ISSUES_REPO || "DroneSurveyCR/central-health-intelligence";
const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "chi-support-bot",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Create a GitHub issue mirroring a ticket. Returns { number, url } or null. */
export async function createGithubIssue(opts: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<{ number: number; url: string } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/repos/${REPO}/issues`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ title: opts.title, body: opts.body, labels: opts.labels ?? ["support"] }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { number: number; html_url: string };
    return { number: j.number, url: j.html_url };
  } catch {
    return null;
  }
}

/** Add a comment to a mirrored issue (best-effort). */
export async function commentGithubIssue(issueNumber: number, body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  try {
    await fetch(`${API}/repos/${REPO}/issues/${issueNumber}/comments`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ body }),
    });
  } catch {
    /* best-effort */
  }
}

/** Open/close a mirrored issue when the ticket status changes (best-effort). */
export async function setGithubIssueState(issueNumber: number, state: "open" | "closed"): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  try {
    await fetch(`${API}/repos/${REPO}/issues/${issueNumber}`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ state }),
    });
  } catch {
    /* best-effort */
  }
}
