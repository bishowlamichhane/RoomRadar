"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KB_META,
  QUICK_REPLIES,
  matchIntent,
  type Cta,
} from "@/lib/assistant/match";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
  full?: string;
  streaming?: boolean;
  cta?: Cta;
};

const CREDIT_KEY = "rr-asst-credits";
const THREAD_KEY = "rr-asst-thread";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const GREETING = (() => {
  const g = matchIntent("hi");
  return g.answer;
})();

export default function RadarAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [credits, setCredits] = useState<number>(KB_META.creditLimit);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimers = useRef<number[]>([]);
  const typingTimer = useRef<number | null>(null);

  // Reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Hydrate persisted credits + thread
  useEffect(() => {
    try {
      const c = localStorage.getItem(CREDIT_KEY);
      if (c !== null) {
        const n = Number(c);
        if (Number.isFinite(n) && n >= 0 && n <= KB_META.creditLimit) setCredits(n);
      }
      const t = localStorage.getItem(THREAD_KEY);
      if (t) {
        const parsed = JSON.parse(t) as Message[];
        if (Array.isArray(parsed))
          setMessages(
            parsed.map((m) => ({
              ...m,
              streaming: false,
              full: undefined,
            })),
          );
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CREDIT_KEY, String(credits));
    } catch {
      /* ignore */
    }
  }, [credits, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      // Only persist finalized text
      const persistable = messages
        .filter((m) => !m.streaming)
        .map(({ id, role, text, cta }) => ({ id, role, text, cta }));
      localStorage.setItem(THREAD_KEY, JSON.stringify(persistable));
    } catch {
      /* ignore */
    }
  }, [messages, hydrated]);

  // Auto-scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing, open]);

  // On open: greet if empty, focus input, wire Esc
  useEffect(() => {
    if (!open) return;
    if (hydrated && messages.length === 0) {
      setMessages([
        { id: uid(), role: "assistant", text: GREETING },
      ]);
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hydrated]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      streamTimers.current.forEach((id) => window.clearTimeout(id));
      streamTimers.current = [];
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  const streamAssistant = useCallback(
    (answer: string, cta?: Cta) => {
      const id = uid();
      if (reducedMotion) {
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", text: answer, cta },
        ]);
        return;
      }
      // Insert empty assistant bubble, then reveal characters
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", text: "", full: answer, streaming: true, cta },
      ]);
      const total = Math.min(1000, Math.max(300, answer.length * 15));
      const step = total / Math.max(1, answer.length);
      for (let i = 1; i <= answer.length; i++) {
        const t = window.setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    text: answer.slice(0, i),
                    streaming: i < answer.length,
                  }
                : m,
            ),
          );
        }, i * step);
        streamTimers.current.push(t);
      }
    },
    [reducedMotion],
  );

  const handleSend = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || typing) return;
      if (credits <= 0) return;

      const userMsg: Message = { id: uid(), role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setCredits((c) => Math.max(0, c - 1));

      setTyping(true);
      const delay = reducedMotion ? 0 : 500 + Math.floor(Math.random() * 600);
      typingTimer.current = window.setTimeout(() => {
        const { answer, cta } = matchIntent(text);
        setTyping(false);
        streamAssistant(answer, cta);
      }, delay);
    },
    [typing, credits, reducedMotion, streamAssistant],
  );

  const resetCredits = () => setCredits(KB_META.creditLimit);
  const clearChat = () => {
    streamTimers.current.forEach((id) => window.clearTimeout(id));
    streamTimers.current = [];
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    setTyping(false);
    setMessages([{ id: uid(), role: "assistant", text: GREETING }]);
  };

  const outOfCredits = credits <= 0;
  const showQuickReplies = messages.length <= 1 || outOfCredits;

  const creditsTone =
    credits <= 0
      ? "bg-red-100 text-red-700"
      : credits <= 3
        ? "bg-[color:var(--color-warm-tint)] text-[color:var(--color-warm)]"
        : "bg-white/15 text-white";

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Radar Assistant chat"
          title="Ask Radar Assistant"
          className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] shadow-[0_18px_40px_-12px_rgba(14,110,110,0.55)] flex items-center justify-center transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12a8 8 0 0 1-11.6 7.15L4 20l1-4.4A8 8 0 1 1 21 12z" />
            <circle cx="8.5" cy="12" r=".9" fill="white" stroke="none" />
            <circle cx="12" cy="12" r=".9" fill="white" stroke="none" />
            <circle cx="15.5" cy="12" r=".9" fill="white" stroke="none" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Radar Assistant chat"
          aria-modal="false"
          className={`fixed z-50 asst-panel ${
            // desktop anchor
            "md:bottom-6 md:right-6 md:w-[360px] md:h-[520px]"
          } bottom-0 right-0 left-0 md:left-auto w-full h-[85vh] md:h-[520px]`}
        >
          <div className="w-full h-full bg-white rounded-t-3xl md:rounded-3xl overflow-hidden shadow-[0_28px_60px_-18px_rgba(23,26,28,0.35)] border border-black/5 flex flex-col">
            {/* Header */}
            <div className="bg-[color:var(--color-primary)] text-white px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12a8 8 0 0 1-11.6 7.15L4 20l1-4.4A8 8 0 1 1 21 12z" />
                  <circle cx="8.5" cy="12" r=".9" fill="white" stroke="none" />
                  <circle cx="12" cy="12" r=".9" fill="white" stroke="none" />
                  <circle cx="15.5" cy="12" r=".9" fill="white" stroke="none" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-display text-[17px] leading-tight font-semibold truncate">
                    {KB_META.assistantName}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-emerald-200">
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-emerald-300 ${reducedMotion ? "" : "asst-dot"}`}
                    />
                    online
                  </span>
                </div>
                <div className="text-[11px] text-white/75 truncate">
                  rule-based helper · {KB_META.creditLimit} demo credits
                </div>
              </div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest rounded-full px-2 py-1 ${creditsTone}`}
                title="Demo credit limit"
              >
                credits {credits}/{KB_META.creditLimit}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="ml-1 w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              aria-live="polite"
              className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-[color:var(--color-canvas)]"
            >
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  text={m.text}
                  cta={m.cta}
                  streaming={m.streaming}
                  reducedMotion={reducedMotion}
                  onCtaClick={() => setOpen(false)}
                />
              ))}
              {typing && <TypingBubble reducedMotion={reducedMotion} />}
              {showQuickReplies && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      disabled={outOfCredits}
                      className="text-[12px] rounded-full border border-[color:var(--color-primary)]/30 bg-white text-[color:var(--color-primary-600)] hover:bg-[color:var(--color-primary-tint)] px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {outOfCredits && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-[12.5px] p-3 flex items-start gap-3">
                  <span aria-hidden>◐</span>
                  <div className="flex-1">
                    <div className="font-medium">Demo credits used up.</div>
                    <div className="text-red-700/80">
                      This is a demo cap on the rule-based assistant. Reset to keep chatting.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetCredits}
                    className="text-[11px] font-semibold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded-full px-3 py-1.5"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Input row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="border-t border-black/5 bg-white px-3 py-2.5 flex items-center gap-2"
            >
              <label htmlFor="rr-asst-input" className="sr-only">
                Ask the Radar Assistant
              </label>
              <input
                id="rr-asst-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  outOfCredits
                    ? "Reset credits to continue…"
                    : typing
                      ? "Radar Assistant is typing…"
                      : "Ask about areas, rent, fair-price…"
                }
                disabled={outOfCredits || typing}
                className="flex-1 min-w-0 bg-[color:var(--color-canvas)] rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/40 disabled:opacity-60"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear chat"
                className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center text-[color:var(--color-muted)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M2 4h10M5 4V2h4v2M4 4l1 8h4l1-8" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!input.trim() || outOfCredits || typing}
                className="rounded-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] disabled:opacity-40 disabled:cursor-not-allowed text-white w-9 h-9 flex items-center justify-center"
                aria-label="Send"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({
  role,
  text,
  cta,
  streaming,
  reducedMotion,
  onCtaClick,
}: {
  role: Role;
  text: string;
  cta?: Cta;
  streaming?: boolean;
  reducedMotion: boolean;
  onCtaClick: () => void;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`${reducedMotion ? "" : "asst-msg"} flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug whitespace-pre-wrap break-words ${
          isUser
            ? "bg-[color:var(--color-primary)] text-white rounded-br-md"
            : "bg-white border border-black/5 text-[color:var(--color-ink)] rounded-bl-md shadow-sm"
        }`}
      >
        {text}
      </div>
      {cta && !isUser && !streaming && (
        <Link
          href={cta.href}
          onClick={onCtaClick}
          className="mt-1.5 max-w-[85%] inline-flex items-center gap-1.5 text-[12.5px] font-medium rounded-full border border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary-tint)] text-[color:var(--color-primary-600)] hover:bg-[color:var(--color-primary)] hover:text-white hover:border-[color:var(--color-primary)] transition-colors px-3 py-1.5"
        >
          <span aria-hidden>◎</span>
          <span className="truncate">{cta.label}</span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

function TypingBubble({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className={`${reducedMotion ? "" : "asst-msg"} flex justify-start`}>
      <div className="bg-white border border-black/5 rounded-2xl rounded-bl-md shadow-sm px-3.5 py-2.5 inline-flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] ${reducedMotion ? "" : "asst-dot"}`}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] ${reducedMotion ? "" : "asst-dot"}`}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] ${reducedMotion ? "" : "asst-dot"}`}
        />
      </div>
    </div>
  );
}
