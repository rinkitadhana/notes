"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FilePlus2, FileText, MoreHorizontal, Smile, Trash2 } from "lucide-react";
import { deletePage, patchPageFullLocal, patchPageLocal, savePage, touchPageLocal, usePage } from "@/lib/client";
import { relativeTime } from "@/lib/dates";
import type { PageMeta } from "@/lib/types";
import type { EditorHandle } from "./editor";
import { TopBar, useShell, useTree } from "./shell";
import { toast, toastError } from "./toast";
import { cn, IconButton, MenuItem, Popover } from "./ui";

const Editor = dynamic(() => import("./editor"), { ssr: false, loading: () => <EditorSkeleton /> });

const EMOJIS =
  "📝 📓 📚 📌 💡 ✅ 🎯 🚀 ⭐ 🔥 ❤️ 💼 🏠 📅 🧠 💰 🎨 🎵 🍕 ☕ 🌱 🌙 ☀️ ⚡ ✈️ 🏋️ 🧘 🎮 📷 🛠️ 🧪 🌊 🍀 🐱 🐶 🦊 🎉 🔒 💬 🗺️".split(" ");

type SaveState = "idle" | "saving" | "saved" | "error";

export function NoteView({ id }: { id: string }) {
  const { data, error, isLoading } = usePage(id);
  const tree = useTree();
  const meta = tree.byId.get(id);

  useEffect(() => {
    touchPageLocal(id);
  }, [id]);

  if (error) {
    return (
      <>
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
          <FileText size={40} strokeWidth={1.2} />
          <p>This note doesn&apos;t exist or was deleted.</p>
          <Link href="/" className="mt-2 text-sm text-accent hover:underline">
            Back home
          </Link>
        </div>
      </>
    );
  }
  if (isLoading || !data) {
    return (
      <>
        <TopBar />
        <div className="mx-auto w-full max-w-[900px] px-[54px] pt-24">
          <div className="mb-6 h-10 w-1/2 animate-pulse rounded bg-hover" />
          <EditorSkeleton />
        </div>
      </>
    );
  }
  return <NoteEditor page={{ ...data, ...(meta ?? {}) }} initialContent={data.content} tree={tree} />;
}

function NoteEditor({
  page,
  initialContent,
  tree,
}: {
  page: PageMeta;
  initialContent: unknown[];
  tree: ReturnType<typeof useTree>;
}) {
  const router = useRouter();
  const { newNote } = useShell();
  const id = page.id;
  const [title, setTitle] = useState(page.title);
  const [save, setSave] = useState<SaveState>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreEl, setMoreEl] = useState<HTMLElement | null>(null);
  const [iconEl, setIconEl] = useState<HTMLElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<EditorHandle | null>(null);

  // Pending changes, flushed on a debounce, on ⌘S and on leave.
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setSave("saving");
    try {
      await savePage(id, patch);
      setSave((s) => (s === "saving" ? "saved" : s));
    } catch (e) {
      setSave("error");
      pending.current = { ...patch, ...pending.current };
      toastError(e);
    }
  }, [id]);

  const queue = useCallback(
    (patch: Record<string, unknown>, delay = 600) => {
      pending.current = { ...pending.current, ...patch };
      setSave("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush],
  );

  useEffect(() => {
    const beacon = () => {
      const patch = pending.current;
      if (!Object.keys(patch).length) return;
      pending.current = {};
      fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive: true,
      });
    };
    window.addEventListener("beforeunload", beacon);
    return () => {
      window.removeEventListener("beforeunload", beacon);
      if (timer.current) clearTimeout(timer.current);
      beacon();
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (!page.title && !initialContent.length) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = `${title || "Untitled"} · Notes`;
    return () => {
      document.title = "Notes";
    };
  }, [title]);

  const onTitle = (v: string) => {
    const clean = v.replace(/\n/g, "");
    setTitle(clean);
    patchPageLocal(id, { title: clean });
    queue({ title: clean }, 400);
  };

  const setIcon = (icon: string) => {
    patchPageLocal(id, { icon });
    patchPageFullLocal(id, { icon });
    queue({ icon }, 0);
    setPickerOpen(false);
  };

  const onContent = useCallback(
    (blocks: unknown[]) => {
      patchPageFullLocal(id, { content: blocks });
      queue({ content: blocks }, 700);
    },
    [id, queue],
  );

  const onReady = useCallback((e: EditorHandle) => {
    editorRef.current = e;
  }, []);

  const focusEditor = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const first = ed.document[0];
    if (first) ed.setTextCursorPosition(first, "start");
    ed.focus();
  };

  const ancestors = tree.ancestors(id);
  const kids = tree.children(id);

  return (
    <>
      <TopBar
        right={
          <>
            <span className="mr-1 hidden text-xs text-faint sm:inline">
              {save === "saving" ? (
                "Saving…"
              ) : save === "error" ? (
                <span className="text-danger">Not saved</span>
              ) : (
                <SavedAgo iso={page.updatedAt} />
              )}
            </span>
            <IconButton ref={setMoreEl} onClick={() => setMenuOpen((o) => !o)} className="h-7 w-7" title="More">
              <MoreHorizontal size={16} />
            </IconButton>
            <Popover anchor={moreEl} open={menuOpen} onClose={() => setMenuOpen(false)} align="end" className="w-52">
              <MenuItem
                icon={<FilePlus2 size={14} />}
                onClick={() => {
                  setMenuOpen(false);
                  flush();
                  newNote(id);
                }}
              >
                Add page inside
              </MenuItem>
              <MenuItem
                icon={<Trash2 size={14} />}
                danger
                onClick={async () => {
                  setMenuOpen(false);
                  if (!confirm(`Delete “${title || "Untitled"}”${kids.length ? " and the notes inside it" : ""}?`)) return;
                  pending.current = {};
                  try {
                    router.push("/");
                    await deletePage(id);
                    toast("Note deleted");
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                Delete note
              </MenuItem>
              <div className="mt-1 border-t border-line px-2 pb-1 pt-2 text-xs text-faint">
                Created {new Date(page.createdAt).toLocaleString()}
              </div>
            </Popover>
          </>
        }
      >
        <nav className="flex min-w-0 items-center text-fg">
          {ancestors.map((a) => (
            <span key={a.id} className="flex min-w-0 items-center">
              <Link href={`/notes/${a.id}`} className="flex min-w-0 items-center gap-1 truncate rounded px-1.5 py-0.5 hover:bg-hover">
                {a.icon && <span>{a.icon}</span>}
                <span className="truncate">{a.title || "Untitled"}</span>
              </Link>
              <span className="px-0.5 text-faint">/</span>
            </span>
          ))}
          <span className="flex min-w-0 items-center gap-1 truncate px-1.5 py-0.5">
            {page.icon && <span>{page.icon}</span>}
            <span className="truncate">{title || "Untitled"}</span>
          </span>
        </nav>
      </TopBar>

      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-[900px] pt-16 sm:pt-20">
          <div className="group/head px-[54px]">
            {page.icon ? (
              <button
                ref={setIconEl}
                onClick={() => setPickerOpen(true)}
                className="mb-2 flex h-[78px] w-[78px] items-center justify-center rounded-lg text-[64px] leading-none transition-colors hover:bg-hover"
              >
                {page.icon}
              </button>
            ) : (
              <button
                ref={setIconEl}
                onClick={() => setPickerOpen(true)}
                className="mb-1 flex h-7 items-center gap-1.5 rounded px-1.5 text-sm text-faint opacity-0 transition-opacity hover:bg-hover hover:text-muted focus:opacity-100 group-hover/head:opacity-100"
              >
                <Smile size={15} /> Add icon
              </button>
            )}

            <textarea
              ref={titleRef}
              value={title}
              rows={1}
              placeholder="Untitled"
              onChange={(e) => onTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || (e.key === "ArrowDown" && e.currentTarget.selectionStart === title.length)) {
                  e.preventDefault();
                  focusEditor();
                }
              }}
              className="mb-2 mt-1 block w-full resize-none overflow-hidden bg-transparent text-[40px] font-bold leading-[1.2] tracking-tight text-fg outline-none placeholder:text-[#e1e1e0] dark:placeholder:text-[#373737]"
            />

            {kids.length > 0 && (
              <div className="mb-3 space-y-px">
                {kids.map((k) => (
                  <Link
                    key={k.id}
                    href={`/notes/${k.id}`}
                    className="-mx-1.5 flex items-center gap-2 rounded px-1.5 py-1 text-[15px] transition-colors hover:bg-hover"
                  >
                    <span className="flex w-5 justify-center">{k.icon || <FileText size={16} className="text-muted" />}</span>
                    <span className="border-b border-line font-medium">{k.title || "Untitled"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Editor initial={initialContent} onChange={onContent} onReady={onReady} />
        </article>
      </div>

      <Popover anchor={iconEl} open={pickerOpen} onClose={() => setPickerOpen(false)} className="w-[296px] p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setIcon(e)} className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-hover">
              {e}
            </button>
          ))}
        </div>
        {page.icon && (
          <button
            onClick={() => setIcon("")}
            className={cn("mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-muted hover:bg-hover")}
          >
            Remove icon
          </button>
        )}
      </Popover>
    </>
  );
}

function SavedAgo({ iso }: { iso: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return <>Edited {relativeTime(iso)}</>;
}

function EditorSkeleton() {
  return (
    <div className="space-y-3 px-[54px] pt-2">
      {[92, 80, 86, 40].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
