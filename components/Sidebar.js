// components/Sidebar.js
// -----------------------------------------------------------------------------
// The left sidebar: brand, New chat button, and the USER SWITCHER.
// (Chat history list removed — the app shows one live conversation at a time,
//  and switching users starts a fresh chat.)
// -----------------------------------------------------------------------------
"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { USERS, getUserId, setUserId } from "@/lib/user";

export default function Sidebar({ onNewChat, onUserSwitch, open, onClose }) {
  // Track which user is active. We read the saved value AFTER mount to avoid
  // a server/client mismatch (localStorage only exists in the browser).
  const [userId, setUid] = useState(USERS[0].id);

  useEffect(() => {
    setUid(getUserId());
  }, []);

  // When the dropdown changes: save the choice, update local state, and tell
  // the parent to start a fresh chat for the new user.
  const handleUserChange = (e) => {
    const id = e.target.value;
    setUserId(id);   // saves to localStorage; next message will use this user
    setUid(id);      // updates the UI immediately
    onUserSwitch?.(); // wipe history + jump to a new empty chat
  };

  // Find the active user's display name + first initial for the avatar.
  const activeUser = USERS.find((u) => u.id === userId) || USERS[0];
  const initial = activeUser.name.charAt(0).toUpperCase();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={`fixed z-30 flex h-full w-72 flex-col border-r border-slate-200 bg-white transition-transform
        dark:border-white/10 dark:bg-slate-900 md:static md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-sky-400/30">
            <img src="/logo.png" alt="ParkerBot logo" className="h-full w-full object-cover" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900 dark:text-white">ParkerBot</span>
          <button className="ml-auto text-slate-500 md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New chat — darker sky/pink so it reads as a clickable button */}
        <div className="px-3">
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-pink-600 active:scale-[.98]"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        {/* Spacer pushes the user switcher to the bottom (history list removed) */}
        <div className="flex-1" />

        {/* USER SWITCHER */}
        <div className="m-3 rounded-xl bg-slate-100 p-3 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-pink-400 font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active user
              </p>
              <select
                value={userId}
                onChange={handleUserChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
              >
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}