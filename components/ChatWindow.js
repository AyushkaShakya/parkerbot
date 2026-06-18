// components/ChatWindow.js
// -----------------------------------------------------------------------------
// The main chat column: header (title + clear + theme toggle), the scrolling
// message list (empty state + typing indicator), and the Composer.
// -----------------------------------------------------------------------------
"use client";

import { useRef, useEffect } from "react";
import { Bot, Trash2, Menu, Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import ThemeToggle from "./ThemeToggle";

export default function ChatWindow({
  chat,
  isTyping,
  onSend,
  onClear,
  dark,
  onToggleTheme,
  onOpenSidebar,
}) {
  const scrollRef = useRef(null);
  const messages = chat?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
        <button className="text-slate-600 dark:text-slate-300 md:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-sky-500" />
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{chat?.title ?? "New chat"}</h1>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onClear}
            title="Clear chat"
            aria-label="Clear chat"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Empty state */}
          {messages.length === 0 && !isTyping && (
            <div className="grid place-items-center py-20 text-center">
              <div className="mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-xl shadow-sky-400/30">
  <img src="/logo.png" alt="ParkerBot logo" className="h-full w-full object-cover" />
</div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                How can I help today?
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Ask me anything, or just say hi. Enter to send, Shift+Enter for a new line.
              </p>
            </div>
          )}

          {/* The conversation */}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {/* Typing indicator while awaiting the reply */}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <Composer onSend={onSend} disabled={isTyping} />
    </main>
  );
}