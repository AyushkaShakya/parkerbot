// components/ChatApp.js
// -----------------------------------------------------------------------------
// The top-level component. It connects the hooks (state/logic) to the UI
// components (Sidebar + ChatWindow) and manages the mobile sidebar drawer.
// -----------------------------------------------------------------------------
"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { useChats } from "@/hooks/useChats";
import { useTheme } from "@/hooks/useTheme";

export default function ChatApp() {
  // All chat data + actions come from the useChats hook.
  const {
    chats, activeChat, activeId, isTyping,
    newChat, resetChat, selectChat, clearChat, sendMessage,
  } = useChats();

  // Dark/light mode from the useTheme hook.
  const { dark, toggle } = useTheme();

  // Whether the mobile sidebar drawer is open.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selecting/creating a chat on mobile should also close the drawer.
  const handleSelect = (id) => {
    selectChat(id);
    setSidebarOpen(false);
  };
  const handleNew = () => {
    newChat();
    setSidebarOpen(false);
  };

  // When the active user changes, wipe everything and start a fresh chat.
  const handleUserSwitch = () => {
    resetChat();
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        chats={chats}
        activeId={activeId}
        onNewChat={handleNew}
        onSelect={handleSelect}
        onUserSwitch={handleUserSwitch}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatWindow
        chat={activeChat}
        isTyping={isTyping}
        onSend={sendMessage}
        onClear={clearChat}
        dark={dark}
        onToggleTheme={toggle}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}