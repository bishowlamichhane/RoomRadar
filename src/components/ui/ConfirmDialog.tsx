"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function useConfirm() {
  const fn = useContext(ConfirmContext);
  if (!fn)
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

type Resolver = (value: boolean) => void;

export function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // If a prior dialog is still resolving somehow, resolve it false first
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOpts(o);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  // Keyboard: Esc cancels, Enter confirms. Focus the confirm button on open.
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [opts, close]);

  // Prevent background scroll while dialog is open.
  useEffect(() => {
    if (!opts) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [opts]);

  const isDanger = opts?.tone !== "primary"; // default to danger for delete-style flows

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={opts.title}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
          <div
            aria-hidden
            onClick={() => close(false)}
            className="absolute inset-0 bg-black/45 cnf-backdrop"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_28px_60px_-18px_rgba(23,26,28,0.4)] border border-black/5 cnf-panel">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-none ${
                    isDanger
                      ? "bg-red-50 text-red-600"
                      : "bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary)]"
                  }`}
                >
                  {isDanger ? <TrashIcon /> : <QuestionIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                    {opts.title}
                  </h3>
                  {opts.description && (
                    <p className="text-sm text-[color:var(--color-muted)] mt-1.5 leading-relaxed">
                      {opts.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-black/5 px-5 py-3.5 flex items-center justify-end gap-2 bg-[color:var(--color-canvas)]/60 rounded-b-2xl">
              <button
                type="button"
                onClick={() => close(false)}
                className="text-sm font-medium text-[color:var(--color-ink)]/70 hover:text-[color:var(--color-ink)] rounded-xl px-4 py-2 hover:bg-black/5"
              >
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`text-sm font-semibold text-white rounded-xl px-4 py-2 transition-colors ${
                  isDanger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)]"
                }`}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
      <path d="M12 18h.01" />
    </svg>
  );
}
