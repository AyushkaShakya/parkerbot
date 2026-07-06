// components/ChatApp.js
"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileUpload = (fileName) => {
    if (!uploadedFiles.includes(fileName)) {
      setUploadedFiles(prev => [...prev, fileName]);
    }
    setActiveFile(fileName);
    setMessages([{
      role: "assistant",
      content: `I have processed **${fileName}**. Ask me anything about it!`,
    }]);
  };

  const handleSelectFile = (fileName) => {
    setActiveFile(fileName);
    setMessages([{
      role: "assistant",
      content: `Switched to **${fileName}**. What would you like to know?`,
    }]);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveFile(null);
  };

  const handleDeleteFile = (fileName) => {
    setUploadedFiles(prev => prev.filter(f => f !== fileName));
    if (activeFile === fileName) {
      setActiveFile(null);
      setMessages([]);
    }
  };

  const sendMessage = async (content) => {
    const userMessage = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          fileName: activeFile,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || data.error || "Something went wrong.",
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--cream-bg)]">
      <Sidebar
        uploadedFiles={uploadedFiles}
        activeFile={activeFile}
        onFileUpload={handleFileUpload}
        onSelectFile={handleSelectFile}
        onDeleteFile={handleDeleteFile}
        onNewChat={handleNewChat}
      />
      <ChatWindow
        messages={messages}
        isTyping={isTyping}
        onSend={sendMessage}
        activeFile={activeFile}
      />
    </div>
  );
}