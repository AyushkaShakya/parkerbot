// components/MessageBubble.js
// -----------------------------------------------------------------------------
// One message: avatar, rounded bubble, timestamp, copy-on-hover button.
// User bubbles = coffee brown on the right; AI bubbles = cream card on the left.
// AI messages are rendered as Markdown (bold, tables, lists) so the model's
// formatted answers display properly instead of showing raw ** and | symbols.
// -----------------------------------------------------------------------------
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    <div className={`flex message-animate gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar — P for Parker AI, U for user */}
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--coffee)" }}
      >
        {isUser ? "U" : "P"}
      </div>

      {/* Bubble + meta row */}
      <div className={`group flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser ? "rounded-br-md text-white" : "rounded-bl-md"
          }`}
          style={
            isUser
              ? { backgroundColor: "var(--coffee)" }
              : {
                  backgroundColor: "var(--cream-card)",
                  color: "var(--text-dark)",
                  border: "1px solid var(--tan-border)",
                }
          }
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.text}</span>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div
          className="mt-1 flex items-center gap-2 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{formatTime(message.time)}</span>
          <button
            onClick={copy}
            className="opacity-0 transition group-hover:opacity-100"
            title="Copy message"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" style={{ color: "#5a9a5a" }} />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}