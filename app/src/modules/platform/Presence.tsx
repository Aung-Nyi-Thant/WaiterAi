"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Keeps a sheet on screen for 170 ms after it is closed so it can slide away (leaving is quicker than arriving: it enters in 320 ms).
// Use it as <Presence>{open && <Sheet/>}</Presence>. With reduced motion, or without matchMedia (tests), it closes at once.
export default function Presence({ children }: { children: ReactNode }) {
  const show = !!children;
  const last = useRef<ReactNode>(null);
  const [leaving, setLeaving] = useState(false);
  if (show) last.current = children;
  useEffect(() => {
    if (show) { setLeaving(false); return; }
    if (!last.current || reducedMotion()) { last.current = null; return; }
    setLeaving(true);
    const id = setTimeout(() => { last.current = null; setLeaving(false); }, 170);
    return () => clearTimeout(id);
  }, [show]);
  if (!show && (!last.current || reducedMotion())) { last.current = null; return null; }
  return <div className={leaving ? "sa-leaving" : undefined} style={{ display: "contents" }}>{show ? children : last.current}</div>;
}

// Ids that appeared since the last refresh (a new order, a new call). Nothing counts as new on the first load. They stay "fresh" for
// 1.6 s so a re-render during the animation does not cut it short.
export function useFresh(ids: (string | number)[]): Set<string | number> {
  const seen = useRef<Set<string | number> | null>(null);
  const [fresh, setFresh] = useState<Set<string | number>>(new Set());
  const key = ids.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the content of `ids`
  useEffect(() => {
    if (seen.current) {
      const added = ids.filter((i) => !seen.current!.has(i));
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]));
        setTimeout(() => setFresh((f) => { const n = new Set(f); for (const a of added) n.delete(a); return n; }), 1600);
      }
    }
    seen.current = new Set(ids);
  }, [key]);
  return fresh;
}
