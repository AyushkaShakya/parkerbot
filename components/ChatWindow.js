// components/ChatWindow.js
"use client";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Composer from "./Composer";

function Message({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 message-animate ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-[var(--coffee)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold leading-none">P</span>
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--coffee)] text-white rounded-tr-sm"
            : "bg-[var(--cream-card)] border border-[var(--tan-border)] text-[var(--text-dark)] rounded-tl-sm shadow-sm"
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-[var(--coffee-light)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-[var(--coffee-dark)] text-xs font-bold">U</span>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 bg-[var(--coffee)] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">P</span>
      </div>
      <div className="bg-[var(--cream-card)] border border-[var(--tan-border)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <div className="w-1.5 h-1.5 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isTyping, onSend, activeFile }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[var(--cream-bg)]">

      {/* Header */}
      <div className="bg-[var(--cream-card)] border-b border-[var(--tan-border)] px-6 py-4 flex items-center gap-3">
        <div>
         <h2 className="text-sm font-semibold text-[var(--text-dark)]">
  {activeFile ? activeFile : "Parker AI"}
</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {activeFile ? "Ask anything about this document" : "Upload a PDF to get started"}
          </p>
        </div>
        {activeFile && (
          <span className="ml-auto text-xs bg-[#eef1de] text-[#5b6d3f] px-2 py-1 rounded-full font-medium">
            Active
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[var(--coffee-light)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--coffee)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-2">
  Welcome to Parker AI
</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm">
              Upload a PDF from the sidebar and start asking questions about your study material.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <Composer onSend={onSend} disabled={isTyping} activeFile={activeFile} />
    </div>
  );
}