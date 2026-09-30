"use client";

import { useEffect, useRef } from "react";

// Next.js treats bottom-nav navigation as a fresh page load, so scroll
// position resets to the top every time — unlike a native app's tab bar,
// where each tab remembers where you left it. This restores that: keep
// writing the scroll position to sessionStorage while mounted, and jump
// back to it once the page's content has actually rendered (`ready`).
export function useScrollRestore(key: string, ready: boolean) {
  const restored = useRef(false);

  useEffect(() => {
    const storageKey = `scroll:${key}`;
    function onScroll() {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const saved = sessionStorage.getItem(`scroll:${key}`);
    if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    }
  }, [key, ready]);
}
