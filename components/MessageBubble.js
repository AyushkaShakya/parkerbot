// components/MessageBubble.js
// -----------------------------------------------------------------------------
// One message: avatar, rounded bubble, timestamp, copy-on-hover button.
// User bubbles = sky→pink gradient on the right; AI bubbles = neutral on the left.
// -----------------------------------------------------------------------------
"use client";

import { useState } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import { formatTime } from "@/lib/utils";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`flex animate-bubble gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar — user gets pink→sky, ParkerBot gets sky→pink */}
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isUser
            ? "bg-gradient-to-br from-pink-400 to-sky-400"
            : "bg-gradient-to-br from-sky-500 to-pink-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      {/* Bubble + meta row */}
      <div className={`group flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md bg-gradient-to-br from-sky-500 to-pink-400 text-white"
              : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-white/10"
          }`}
        >
          {message.text}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span>{formatTime(message.time)}</span>
          <button
            onClick={copy}
            className="opacity-0 transition group-hover:opacity-100"
            title="Copy message"
            aria-label="Copy message"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}