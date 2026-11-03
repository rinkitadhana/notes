"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const memory = new Map<string, string>(); // fallback when storage is blocked

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? fallback;
  } catch {
    return memory.get(key) ?? fallback;
  }
}

/** A string persisted in localStorage, SSR-safe and shared across components. */
export function useStored(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: string | ((cur: string) => string)) => {
      const v = typeof next === "function" ? next(read(key, fallback)) : next;
      memory.set(key, v);
      try {
        localStorage.setItem(key, v);
      } catch {}
      listeners.forEach((l) => l());
    },
    [key, fallback],
  );
  return [value, set] as const;
}

const noop = () => () => {};

/** True after hydration — for values that differ between server and client (time, theme). */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
