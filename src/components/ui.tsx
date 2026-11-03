"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-active hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Floating panel anchored to an element. Closes on outside click / Escape. */
export function Popover({
  anchor,
  open,
  onClose,
  children,
  align = "start",
  className,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    let left = align === "end" ? a.right - p.width : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
    let top = a.bottom + 4;
    if (top + p.height > window.innerHeight - 8) top = Math.max(8, a.top - p.height - 4);
    setPos({ top, left });
  }, [open, anchor, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className={cn("animate-pop fixed z-50 rounded-lg bg-surface p-1 shadow-card", className)}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  icon,
  children,
  danger,
  shortcut,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; danger?: boolean; shortcut?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-hover",
        danger ? "text-danger" : "text-fg",
      )}
      {...props}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center text-muted">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-faint">{shortcut}</span>}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface px-1 py-px font-sans text-[10px] font-medium text-muted">
      {children}
    </kbd>
  );
}
