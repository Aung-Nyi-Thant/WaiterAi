"use client";
import { useEffect, useRef } from "react";

export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    cache: "no-store",
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e: any = new Error(data?.error || `Something went wrong (${res.status}).`);
    e.status = res.status;
    throw e;
  }
  return data as T;
}

export function usePoll(fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    ref.current();
    const t = setInterval(() => { if (!document.hidden) ref.current(); }, ms);
    return () => clearInterval(t);
  }, [ms]);
}

export const minutesAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : `${m} min`;
};
