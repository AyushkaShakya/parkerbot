// hooks/useChats.js
// -----------------------------------------------------------------------------
// The "brain" of the app. This custom hook owns all chat state and logic:
//   - the current conversation and its messages
//   - persistence to localStorage (so the current chat survives a refresh)
//   - creating / clearing / resetting chats
//   - sending a message to /api/chat and appending the AI's reply
// -----------------------------------------------------------------------------
"use client";

import { getUserId } from "@/lib/user";
import { useState, useEffect, useCallback } from "react";
import { uid, makeNewChat } from "@/lib/utils";

const STORAGE_KEY = "aurora.chats";

export function useChats() {
  // `chats` holds the conversation(s); `activeId` is the one on screen.
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // true while waiting for AI
  const [loaded, setLoaded] = useState(false); // avoids saving before we load

  // --- Load saved chats once, on mount ---
  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {}
    if (saved && saved.chats?.length) {
      setChats(saved.chats);
      setActiveId(saved.activeId ?? saved.chats[0].id);
    } else {
      const first = makeNewChat();
      setChats([first]);
      setActiveId(first.id);
    }
    setLoaded(true);
  }, []);

  // --- Save to localStorage whenever chats or the active id change ---
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, activeId }));
    } catch {}
  }, [chats, activeId, loaded]);

  const activeChat = chats.find((c) => c.id === activeId) ?? chats[0] ?? null;

  // Helper to immutably update only the active conversation.
  const updateActive = useCallback(
    (updater) =>
      setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...updater(c) } : c))),
    [activeId]
  );

  const newChat = () => {
    const c = makeNewChat();
    setChats((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  // Start completely fresh: throw away ALL conversations and begin one new,
  // empty chat. Used when switching users so the new user sees a clean slate.
  const resetChat = () => {
    const c = makeNewChat();
    setChats([c]);
    setActiveId(c.id);
  };

  const selectChat = (id) => setActiveId(id);

  const clearChat = () => updateActive(() => ({ messages: [], title: "New chat" }));

  // Send a message to the LLM and append the reply.
  const sendMessage = async (text) => {
    const clean = text.trim();
    if (!clean || isTyping || !activeChat) return;

    const userMsg = { id: uid(), role: "user", text: clean, time: Date.now() };

    // 1) Optimistically show the user's message; title new chats from it.
    updateActive((c) => ({
      messages: [...c.messages, userMsg],
      title: c.messages.length === 0 ? clean.slice(0, 40) : c.title,
    }));
    setIsTyping(true);

    try {
      // 2) Build the history the API expects: { role, content }.
      const history = [...activeChat.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));

      // 3) Call our own server route (which holds the secret key).
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, userId: getUserId() }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, something went wrong.";

      // 4) Append the AI's reply.
      updateActive((c) => ({
        messages: [...c.messages, { id: uid(), role: "assistant", text: reply, time: Date.now() }],
      }));
    } catch {
      updateActive((c) => ({
        messages: [
          ...c.messages,
          { id: uid(), role: "assistant", text: "Couldn't reach the server. Please try again.", time: Date.now() },
        ],
      }));
    } finally {
      setIsTyping(false);
    }
  };

  return {
    chats,
    activeChat,
    activeId,
    isTyping,
    newChat,
    resetChat,   // <-- new: used when switching users
    selectChat,
    clearChat,
    sendMessage,
  };
}