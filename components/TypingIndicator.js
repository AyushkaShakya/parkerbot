// components/TypingIndicator.js
// -----------------------------------------------------------------------------
// The "AI is typing…" bubble: three bouncing dots plus a label. Shown while we
// wait for the server's reply.
// -----------------------------------------------------------------------------
"use client";

import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex animate-bubble gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-white/10">
        <div className="flex gap-1">
          {/* Each dot is offset so they bounce in sequence. */}
          <span className="h-2 w-2 animate-blink rounded-full bg-indigo-400" />
          <span className="h-2 w-2 animate-blink rounded-full bg-indigo-400 [animation-delay:.2s]" />
          <span className="h-2 w-2 animate-blink rounded-full bg-indigo-400 [animation-delay:.4s]" />
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">AI is typing…</span>
      </div>
    </div>
  );
}
