// components/Composer.js
// -----------------------------------------------------------------------------
// The message input box: auto-growing textarea, Enter to send (Shift+Enter for
// newline), and a darker sky→pink send button.
// -----------------------------------------------------------------------------
"use client";

import { useRef, useState, useEffect } from "react";
import { Send } from "lucide-react";

export default function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white/70 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="flex flex-1 items-end rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-sky-400 dark:bg-slate-800 dark:ring-white/10 dark:focus-within:ring-sky-500">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message ParkerBot…"
            className="max-h-40 flex-1 resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        </div>
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          title="Send (Enter)"
          aria-label="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-pink-500 text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-pink-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-400 dark:text-slate-500">
        ParkerBot can make mistakes. Enter to send · Shift+Enter for newline.
      </p>
    </div>
  );
}