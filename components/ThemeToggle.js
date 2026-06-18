// components/ThemeToggle.js
// -----------------------------------------------------------------------------
// A single icon button that flips between sun (light) and moon (dark).
// All theme state lives in the useTheme hook; this is just the UI.
// -----------------------------------------------------------------------------
"use client";

import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title="Toggle theme"
      aria-label="Toggle dark mode"
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
