"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

let push: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(message: string, action?: Toast["action"]) {
  push?.({ message, action });
}

export const toastError = (e: unknown) => toast(e instanceof Error ? e.message : "Something went wrong");

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4500);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-pop pointer-events-auto flex items-center gap-3 rounded-lg bg-[#2f2f2f] px-4 py-2.5 text-sm text-white shadow-card dark:bg-[#373737]"
        >
          <span>{t.message}</span>
          {t.action && (
            <button
              className="font-medium text-[#7cc4fa] hover:underline"
              onClick={() => {
                t.action!.run();
                setToasts((ts) => ts.filter((x) => x.id !== t.id));
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
