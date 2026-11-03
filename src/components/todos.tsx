"use client";

import { useRef, useState } from "react";
import { Calendar, Check, ChevronRight, Flag, Plus, Trash2 } from "lucide-react";
import { createTodo, deleteTodo, updateTodo, useTodos } from "@/lib/client";
import { dueLabel, parseQuickAdd, today } from "@/lib/dates";
import type { Priority, Todo } from "@/lib/types";
import { toast, toastError } from "./toast";
import { cn, IconButton } from "./ui";

const PRIORITY_COLOR: Record<Priority, string> = { 3: "#e03e3e", 2: "#d9730d", 1: "#2383e2", 0: "" };

const sortOpen = (a: Todo, b: Todo) =>
  (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.priority - a.priority || b.createdAt.localeCompare(a.createdAt);

export function Todos() {
  const { todos, isLoading, error } = useTodos();
  const [showDone, setShowDone] = useState(false);
  const open = todos.filter((t) => !t.done).sort(sortOpen);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <div>
      <QuickAdd />

      {error && <p className="px-3 py-4 text-sm text-danger">Couldn&apos;t load todos. Is MongoDB running?</p>}
      {isLoading && (
        <div className="space-y-4 px-3 py-4">
          {[60, 45, 70].map((w) => (
            <div key={w} className="flex items-center gap-3">
              <div className="h-[18px] w-[18px] animate-pulse rounded-full bg-hover" />
              <div className="h-3.5 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && open.length === 0 && (
        <p className="px-2 py-4 text-sm text-faint">
          {done.length ? "All clear. Nice." : "Nothing to do yet."}
        </p>
      )}

      <ul className="mt-1">
        {open.map((t) => (
          <TodoRow key={t.id} todo={t} />
        ))}
      </ul>

      {done.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center">
            <button
              onClick={() => setShowDone((s) => !s)}
              className="flex flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm text-muted hover:text-fg"
            >
              <ChevronRight size={13} className={cn("transition-transform", showDone && "rotate-90")} />
              Completed <span className="text-faint">{done.length}</span>
            </button>
            {showDone && (
              <button
                onClick={async () => {
                  if (!confirm(`Clear ${done.length} completed todo${done.length === 1 ? "" : "s"}?`)) return;
                  for (const t of done) await deleteTodo(t.id).catch(toastError);
                }}
                className="rounded px-2 py-1 text-xs text-muted hover:bg-hover"
              >
                Clear
              </button>
            )}
          </div>
          {showDone && (
            <ul>
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAdd() {
  const [text, setText] = useState("");
  const parsed = parseQuickAdd(text);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!parsed.title) return;
    setText("");
    try {
      await createTodo(parsed);
    } catch (e) {
      toastError(e);
      setText(text);
    }
  };

  return (
    <div className="mb-1 flex items-center gap-3 rounded-lg border border-transparent px-2 transition-colors focus-within:border-line focus-within:shadow-sm">
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-accent">
        <Plus size={18} />
      </span>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setText("");
        }}
        placeholder="Add a todo… try “call mom tomorrow !1”"
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
      />
      {parsed.due && (
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs text-fg">
          <Calendar size={11} /> {dueLabel(parsed.due)}
        </span>
      )}
      {parsed.priority > 0 && (
        <Flag size={13} className="shrink-0" style={{ color: PRIORITY_COLOR[parsed.priority as Priority] }} fill="currentColor" />
      )}
      {text && <span className="hidden shrink-0 text-[11px] text-faint sm:inline">↵ to add</span>}
    </div>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const [checked, setChecked] = useState(todo.done);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [seen, setSeen] = useState(todo);
  const dateRef = useRef<HTMLInputElement>(null);
  const t = today();
  const temp = todo.id.startsWith("temp-");

  // Re-sync when the server copy changes.
  if (seen !== todo) {
    setSeen(todo);
    if (seen.done !== todo.done) setChecked(todo.done);
    if (!editing) setTitle(todo.title);
  }

  const toggle = () => {
    if (temp) return;
    const next = !checked;
    setChecked(next);
    setTimeout(() => updateTodo(todo.id, { done: next }).catch(toastError), next ? 350 : 0);
  };

  const commit = () => {
    setEditing(false);
    const v = title.trim();
    if (!v) return setTitle(todo.title);
    if (v !== todo.title) updateTodo(todo.id, { title: v }).catch(toastError);
  };

  const remove = async () => {
    try {
      await deleteTodo(todo.id);
      toast("Todo deleted", {
        label: "Undo",
        run: () => createTodo({ title: todo.title, due: todo.due, priority: todo.priority }).catch(toastError),
      });
    } catch (e) {
      toastError(e);
    }
  };

  const color = PRIORITY_COLOR[todo.priority];

  return (
    <li className={cn("group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-hover", temp && "opacity-60")}>
      <button
        onClick={toggle}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        style={!checked && color ? { borderColor: color } : undefined}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          checked ? "animate-check border-accent bg-accent text-white" : "border-faint hover:bg-hover",
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setTitle(todo.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-[15px] outline-none"
          />
        ) : (
          <button
            onClick={() => !temp && !checked && setEditing(true)}
            className={cn("block w-full truncate text-left text-[15px]", checked && "text-faint line-through decoration-faint")}
          >
            {todo.title}
          </button>
        )}
      </div>

      {todo.due && !todo.done && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 text-xs",
            todo.due < t ? "text-danger" : todo.due === t ? "text-[#0f7b6c] dark:text-[#4dab9a]" : "text-muted",
          )}
        >
          <Calendar size={12} />
          {dueLabel(todo.due)}
        </span>
      )}

      {!temp && (
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          {!todo.done && (
            <span className="relative">
              <IconButton title="Set date" onClick={() => dateRef.current?.showPicker?.()}>
                <Calendar size={13} />
              </IconButton>
              <input
                ref={dateRef}
                type="date"
                value={todo.due ?? ""}
                onChange={(e) => updateTodo(todo.id, { due: e.target.value || null }).catch(toastError)}
                className="pointer-events-none absolute inset-0 opacity-0"
                tabIndex={-1}
              />
            </span>
          )}
          <IconButton title="Delete" onClick={remove} className="hover:text-danger">
            <Trash2 size={14} />
          </IconButton>
        </div>
      )}
    </li>
  );
}
