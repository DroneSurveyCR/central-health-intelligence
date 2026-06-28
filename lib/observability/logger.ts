// HealthSync Cloud — lightweight, dependency-free observability.
//
// One-line structured JSON to stdout (Vercel captures stdout per-invocation),
// plus an optional best-effort POST to Sentry's store endpoint via fetch when
// SENTRY_DSN is set. No SDK, no deps. Nothing here ever throws — observability
// must never take down a request path.
//
// PHI NOTE: callers must not pass patient data in `fields`/`context`. Keep
// these to event names, ids, counts, and error class/message.

type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function emit(level: Level, event: string, fields?: Fields): void {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...(fields ?? {}),
    });
    // Route by severity so platform log levels line up.
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    // Serialization failed (e.g. a circular field) — never throw from logging.
    try {
      console.error(`{"ts":"${new Date().toISOString()}","level":"error","event":"log_serialize_failed","original":"${event}"}`);
    } catch {
      /* give up silently */
    }
  }
}

export const log = {
  info: (event: string, fields?: Fields): void => emit("info", event, fields),
  warn: (event: string, fields?: Fields): void => emit("warn", event, fields),
  error: (event: string, fields?: Fields): void => emit("error", event, fields),
  /** Return a child logger with `requestId` bound to every call. */
  withId(requestId: string) {
    return {
      info: (event: string, ctx?: Fields) => emit("info", event, { ...ctx, requestId }),
      warn: (event: string, ctx?: Fields) => emit("warn", event, { ...ctx, requestId }),
      error: (event: string, ctx?: Fields) => emit("error", event, { ...ctx, requestId }),
    };
  },
};

/** Normalize anything thrown into a plain { type, message, stack } shape. */
function describeError(err: unknown): { type: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { type: err.name || "Error", message: err.message, stack: err.stack };
  }
  return { type: typeof err, message: String(err) };
}

/**
 * Parse a Sentry DSN into the ingest URL + key needed to POST a store event.
 * DSN form: https://<publicKey>@<host>/<projectId>
 * Returns null for anything malformed (caller then degrades to log-only).
 */
function parseDsn(
  dsn: string,
): { storeUrl: string; publicKey: string } | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    // Preserve any path prefix (self-hosted Sentry) before the project id.
    const segments = projectId.split("/");
    const project = segments.pop();
    const prefix = segments.length ? `/${segments.join("/")}` : "";
    const storeUrl = `${u.protocol}//${u.host}${prefix}/api/${project}/store/`;
    return { storeUrl, publicKey };
  } catch {
    return null;
  }
}

/**
 * Log a structured error and, if SENTRY_DSN is set, best-effort POST a minimal
 * event to Sentry's store endpoint. Always logs; the network send is fire-and-
 * forget and fully swallowed. Never throws.
 */
export async function captureError(err: unknown, context?: Fields): Promise<void> {
  const e = describeError(err);
  log.error("captured_error", { error_type: e.type, error_message: e.message, ...(context ?? {}) });

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // no-op when unconfigured

  const parsed = parseDsn(dsn);
  if (!parsed) {
    log.warn("sentry_dsn_invalid");
    return;
  }

  try {
    const event = {
      event_id: globalThis.crypto?.randomUUID?.().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "node",
      level: "error",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      exception: {
        values: [{ type: e.type, value: e.message, stacktrace: e.stack ? { frames: [] } : undefined }],
      },
      extra: { stack: e.stack, ...(context ?? {}) },
    };
    const auth =
      `Sentry sentry_version=7, sentry_client=healthsync-logger/1.0, ` +
      `sentry_key=${parsed.publicKey}`;
    await fetch(parsed.storeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": auth },
      body: JSON.stringify(event),
    });
  } catch {
    // Network/serialization failure — already logged locally; swallow.
  }
}
