// components/Composer.js
"use client";
import { useState, useRef } from "react";

export default function Composer({ onSend, disabled, activeFile }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[var(--cream-card)] border-t border-[var(--tan-border)] px-4 py-4">
      <div className="flex items-end gap-3 bg-[var(--cream-bg)] border border-[var(--tan-border)] rounded-2xl px-4 py-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            activeFile
              ? `Ask anything about ${activeFile}...`
              : "Chat with Parker AI, or upload a PDF to ask about it..."
          }
          rows={1}
          className="flex-1 bg-transparent text-sm text-[var(--text-dark)] placeholder-[var(--text-muted)] resize-none outline-none max-h-32 leading-relaxed disabled:opacity-50"
          style={{ minHeight: "24px" }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-8 h-8 bg-[var(--coffee)] hover:bg-[var(--coffee-dark)] disabled:bg-[var(--tan-border)] rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}