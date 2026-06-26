"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const AUTO_DISMISS_MS = 4000;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * useToast — returns { success, error, info }. Must be called inside a
 * component rendered under <ToastProvider>.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((list) => [...list, { id, kind, message }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg: string) => push("success", msg),
      error: (msg: string) => push("error", msg),
      info: (msg: string) => push("info", msg),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setLeaving(true);
    // Allow the exit transition (~180ms) before removing from the tree.
    window.setTimeout(onDismiss, 200);
  }, [onDismiss]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(close, AUTO_DISMISS_MS);
  }, [close]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Enter transition on next frame.
    const raf = requestAnimationFrame(() => setShown(true));
    startTimer();
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const isError = toast.kind === "error";

  return (
    <div
      className={`toast toast-${toast.kind}${shown ? " toast-in" : ""}${leaving ? " toast-out" : ""}`}
      role="status"
      aria-live={isError ? "assertive" : "polite"}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
    >
      <span className="toast-icon" aria-hidden="true">
        {toast.kind === "success" ? "✓" : isError ? "!" : "i"}
      </span>
      <span className="toast-msg">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={close}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
