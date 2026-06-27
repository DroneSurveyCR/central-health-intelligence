import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, captureError } from "./logger";

describe("log", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits one-line JSON with ts, level, and event", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("thing_happened", { count: 3 });
    expect(spy).toHaveBeenCalledOnce();
    const line = spy.mock.calls[0]![0] as string;
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("thing_happened");
    expect(parsed.count).toBe(3);
    expect(typeof parsed.ts).toBe("string");
  });

  it("routes warn/error to the matching console method", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    log.warn("w");
    log.error("e");
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  it("never throws on un-serializable fields", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => log.info("circular", circular)).not.toThrow();
  });
});

describe("captureError", () => {
  const origDsn = process.env.SENTRY_DSN;
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    if (origDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = origDsn;
  });

  it("logs the error and does NOT fetch when SENTRY_DSN is unset", async () => {
    delete process.env.SENTRY_DSN;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    await captureError(new Error("boom"), { route: "test" });
    expect(error).toHaveBeenCalled();
    const line = error.mock.calls[0]![0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.event).toBe("captured_error");
    expect(parsed.error_message).toBe("boom");
    expect(parsed.route).toBe("test");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs to the parsed Sentry store endpoint when SENTRY_DSN is set", async () => {
    process.env.SENTRY_DSN = "https://pub123@o1.ingest.sentry.io/4567";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    await captureError(new Error("boom"));
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://o1.ingest.sentry.io/api/4567/store/");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-Sentry-Auth"]).toContain("sentry_key=pub123");
  });

  it("never throws even if fetch rejects", async () => {
    process.env.SENTRY_DSN = "https://pub@host/9";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(captureError(new Error("boom"))).resolves.toBeUndefined();
  });
});
