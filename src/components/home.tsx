"use client";

import Link from "next/link";
import { CheckSquare, Clock, FileText, Plus } from "lucide-react";
import { usePages, useTodos } from "@/lib/client";
import { greeting, relativeTime, today } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import type { PageMeta } from "@/lib/types";
import { TopBar, useShell } from "./shell";
import { Todos } from "./todos";

export function HomeScreen() {
  const { pages, isLoading } = usePages();
  const { todos } = useTodos();
  const { newNote } = useShell();
  const mounted = useMounted();

  const recent = [...pages].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 8);
  const t = today();
  const open = todos.filter((x) => !x.done).length;
  const due = todos.filter((x) => !x.done && x.due && x.due <= t).length;

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-6 pb-24 pt-10 sm:px-12">
          <p className="text-sm text-muted">
            {mounted ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}
          </p>
          <h1 className="mb-10 mt-1 text-[32px] font-bold tracking-tight">{mounted ? greeting() : "Hello"}</h1>

          <Section
            icon={<Clock size={14} />}
            title="Recently opened"
            action={
              <button onClick={() => newNote()} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-hover">
                <Plus size={14} /> New note
              </button>
            }
          >
            {isLoading ? (
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[136px] w-[148px] shrink-0 animate-pulse rounded-xl bg-hover" />
                ))}
              </div>
            ) : (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {recent.map((p) => (
                  <NoteCard key={p.id} page={p} />
                ))}
                <button
                  onClick={() => newNote()}
                  className="flex h-[136px] w-[148px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted"
                >
                  <Plus size={20} />
                  New note
                </button>
              </div>
            )}
          </Section>

          <Section
            icon={<CheckSquare size={14} />}
            title="Todos"
            action={
              open > 0 ? (
                <span className="px-1.5">
                  {open} open{due ? ` · ${due} due` : ""}
                </span>
              ) : null
            }
          >
            <Todos />
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        <span className="flex-1">{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

function NoteCard({ page }: { page: PageMeta }) {
  return (
    <Link
      href={`/notes/${page.id}`}
      className="group relative flex h-[136px] w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="h-11 shrink-0 bg-panel" />
      <div className="absolute left-3 top-6 flex h-8 w-8 items-center justify-center text-[26px] leading-none">
        {page.icon || <FileText size={24} className="text-muted" />}
      </div>
      <div className="flex flex-1 flex-col justify-end px-3 pb-3">
        <div className={`line-clamp-2 text-sm font-medium leading-snug ${page.title ? "" : "text-faint"}`}>
          {page.title || "Untitled"}
        </div>
        <div className="mt-1 text-[11px] text-faint">{relativeTime(page.openedAt)}</div>
      </div>
    </Link>
  );
}
