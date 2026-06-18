// hooks/useTheme.js
// -----------------------------------------------------------------------------
// A custom React hook that manages dark/light mode.
//  - Reads the saved choice from localStorage (set by the inline script in
//    layout.js so there's no flash on first paint).
//  - Toggling adds/removes the `dark` class on <html>, which Tailwind uses.
// -----------------------------------------------------------------------------
"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  // Default to dark; corrected on mount from what layout.js already applied.
  const [dark, setDark] = useState(true);

  // On first render, read the actual class the inline script set.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  return { dark, toggle };
}
