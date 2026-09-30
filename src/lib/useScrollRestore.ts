"use client";

import { useEffect, useRef } from "react";

// Next <Link> scrolls to the top on every navigation by default (see
// BottomNav's scroll={false}, which turns that off so it doesn't clobber
// whatever this hook is doing). This hook then owns the scroll position
// outright: restore the saved one if there is one, or explicitly go to
// the top if not, so a genuinely fresh visit doesn't inherit wherever the
// previous page left off.
//
// Recording must not start until *after* that restore: a fresh mount
// naturally sits at scrollY 0 before its data has loaded, and a save
// listener attached immediately would write that 0 to storage and destroy
// the very value the restore is about to read, a moment later. So the
// save listener only gets attached once the restore for this mount has
// already happened.
export function useScrollRestore(key: string, ready: boolean) {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;

    const storageKey = `scroll:${key}`;
    const saved = sessionStorage.getItem(storageKey);

    let cleanup: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, saved ? Number(saved) : 0);
      function onScroll() {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => window.removeEventListener("scroll", onScroll);
    });

    return () => {
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [key, ready]);
}
