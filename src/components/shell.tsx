"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  FilePlus2,
  FileText,
  Home,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
import { createPage, deletePage, movePage, usePages } from "@/lib/client";
import { useMounted, useStored } from "@/lib/hooks";
import type { PageMeta } from "@/lib/types";
import { toast, toastError } from "./toast";
import { cn, IconButton, MenuItem, Popover } from "./ui";

/* ---------------- context ---------------- */

type ShellCtx = { sidebarOpen: boolean; toggleSidebar: () => void; newNote: (parentId?: string | null) => Promise<void> };
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () => useContext(Ctx)!;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebar, setSidebar] = useStored("sidebar", "open");
  const sidebarOpen = sidebar !== "closed";
  const toggleSidebar = useCallback(() => setSidebar((s) => (s === "closed" ? "open" : "closed")), [setSidebar]);

  const newNote = useCallback(
    async (parentId: string | null = null) => {
      try {
        const p = await createPage({ parentId });
        router.push(`/notes/${p.id}`);
      } catch (e) {
        toastError(e);
      }
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.altKey && e.code === "KeyN") {
        e.preventDefault();
        newNote();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar, newNote]);

  return (
    <Ctx.Provider value={{ sidebarOpen, toggleSidebar, newNote }}>
      <div className="flex h-dvh overflow-hidden">
        <aside
          className={cn(
            "shrink-0 overflow-hidden border-r border-line bg-panel transition-[width] duration-200 ease-out",
            sidebarOpen ? "w-60" : "w-0 border-r-0",
          )}
        >
          <div className="h-full w-60">
            <Sidebar />
          </div>
        </aside>
        <main className="relative flex min-w-0 flex-1 flex-col">
          {!sidebarOpen && (
            <IconButton onClick={toggleSidebar} title="Open sidebar (⌘\)" className="absolute left-2 top-2.5 z-20 h-7 w-7">
              <PanelLeftOpen size={16} />
            </IconButton>
          )}
          {children}
        </main>
      </div>
    </Ctx.Provider>
  );
}

/* ---------------- tree ---------------- */

export function useTree() {
  const { pages, isLoading, error } = usePages();
  return useMemo(() => {
    const byId = new Map(pages.map((p) => [p.id, p]));
    const kids = new Map<string | null, PageMeta[]>();
    for (const p of pages) {
      const key = p.parentId && byId.has(p.parentId) ? p.parentId : null;
      if (!kids.has(key)) kids.set(key, []);
      kids.get(key)!.push(p);
    }
    for (const list of kids.values()) list.sort((a, b) => a.order - b.order);
    const children = (id: string | null) => kids.get(id) ?? [];
    const ancestors = (id: string) => {
      const out: PageMeta[] = [];
      let cur = byId.get(id);
      while (cur?.parentId && byId.has(cur.parentId)) {
        cur = byId.get(cur.parentId)!;
        out.unshift(cur);
      }
      return out;
    };
    const isInside = (id: string, of: string) => ancestors(id).some((a) => a.id === of);
    return { pages, byId, children, ancestors, isInside, isLoading, error };
  }, [pages, isLoading, error]);
}

type Tree = ReturnType<typeof useTree>;

const parseSet = (s: string) => {
  try {
    return new Set<string>(JSON.parse(s));
  } catch {
    return new Set<string>();
  }
};

function useExpanded() {
  const [raw, setRaw] = useStored("expanded-notes", "[]");
  const expanded = useMemo(() => parseSet(raw), [raw]);
  const update = useCallback(
    (fn: (s: Set<string>) => void) =>
      setRaw((cur) => {
        const next = parseSet(cur);
        fn(next);
        return JSON.stringify([...next]);
      }),
    [setRaw],
  );
  return {
    expanded,
    toggle: (id: string) => update((s) => (s.has(id) ? s.delete(id) : s.add(id))),
    open: (...ids: string[]) => update((s) => ids.forEach((i) => s.add(i))),
  };
}

/* ---------------- sidebar ---------------- */

function Sidebar() {
  const pathname = usePathname();
  const { toggleSidebar, newNote } = useShell();
  const tree = useTree();
  const { expanded, toggle, open } = useExpanded();
  const activeId = pathname.startsWith("/notes/") ? pathname.split("/")[2] : null;
  const roots = tree.children(null);
  const [rootDrop, setRootDrop] = useState(false);

  // Reveal the active note in the tree.
  const ancestorKey = activeId ? tree.ancestors(activeId).map((a) => a.id).join(",") : "";
  useEffect(() => {
    if (ancestorKey) open(...ancestorKey.split(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancestorKey]);

  return (
    <div className="flex h-full flex-col text-sm text-muted">
      <div className="group flex h-11 items-center gap-2 px-3">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-fg text-[11px] font-semibold text-bg">N</div>
        <Link href="/" className="flex-1 truncate font-medium text-fg">
          Notes
        </Link>
        <IconButton
          onClick={toggleSidebar}
          title="Close sidebar (⌘\)"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <PanelLeftClose size={16} />
        </IconButton>
      </div>

      <nav className="px-1.5">
        <Link
          href="/"
          className={cn(
            "flex h-7 items-center gap-2 rounded px-2 transition-colors hover:bg-hover",
            pathname === "/" && "bg-active font-medium text-fg",
          )}
        >
          <span className="flex w-5 justify-center">
            <Home size={16} />
          </span>
          Home
        </Link>
        <button
          onClick={() => newNote()}
          className="flex h-7 w-full items-center gap-2 rounded px-2 text-left transition-colors hover:bg-hover"
        >
          <span className="flex w-5 justify-center">
            <Plus size={16} />
          </span>
          New note
        </button>
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-1.5 pb-4">
        <div
          className={cn("group/label flex items-center rounded pr-1", rootDrop && "bg-accent-soft")}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("text/note-id")) return;
            e.preventDefault();
            setRootDrop(true);
          }}
          onDragLeave={() => setRootDrop(false)}
          onDrop={(e) => {
            setRootDrop(false);
            const id = e.dataTransfer.getData("text/note-id");
            if (!id) return;
            const last = roots.filter((r) => r.id !== id).at(-1);
            movePage(id, null, (last?.order ?? 0) + 1000).catch(toastError);
          }}
        >
          <span className="flex-1 px-2 py-1 text-xs font-medium text-faint">Notes</span>
          <IconButton onClick={() => newNote()} title="New note (⌘⌥N)" className="h-5 w-5 opacity-0 group-hover/label:opacity-100">
            <Plus size={14} />
          </IconButton>
        </div>

        {tree.isLoading && (
          <div className="space-y-2 px-2 py-1">
            {[70, 50, 60].map((w) => (
              <div key={w} className="h-3 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {tree.error && <p className="px-2 py-1 text-xs text-danger">Can&apos;t reach MongoDB. Is it running?</p>}
        {!tree.isLoading && !tree.error && roots.length === 0 && (
          <button
            onClick={() => newNote()}
            className="w-full rounded px-2 py-1 text-left text-faint hover:bg-hover"
          >
            No notes yet — create one
          </button>
        )}

        {roots.map((p) => (
          <NoteRow key={p.id} page={p} depth={0} tree={tree} activeId={activeId} expanded={expanded} toggle={toggle} open={open} />
        ))}
      </div>

      <div className="border-t border-line px-1.5 py-1.5">
        <ThemeToggle />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex h-7 w-full items-center gap-2 rounded px-2 transition-colors hover:bg-hover"
    >
      <span className="flex w-5 justify-center">{dark ? <Sun size={16} /> : <Moon size={16} />}</span>
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

type Zone = "before" | "inside" | "after";

function NoteRow({
  page,
  depth,
  tree,
  activeId,
  expanded,
  toggle,
  open,
}: {
  page: PageMeta;
  depth: number;
  tree: Tree;
  activeId: string | null;
  expanded: Set<string>;
  toggle: (id: string) => void;
  open: (...ids: string[]) => void;
}) {
  const router = useRouter();
  const { newNote } = useShell();
  const kids = tree.children(page.id);
  const isOpen = expanded.has(page.id);
  const active = activeId === page.id;
  const [zone, setZone] = useState<Zone | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreEl, setMoreEl] = useState<HTMLButtonElement | null>(null);

  const drop = async (dragId: string, z: Zone) => {
    if (dragId === page.id || tree.isInside(page.id, dragId)) return;
    try {
      if (z === "inside") {
        const last = kids.filter((k) => k.id !== dragId).at(-1);
        open(page.id);
        await movePage(dragId, page.id, (last?.order ?? 0) + 1000);
      } else {
        const parent = page.parentId && tree.byId.has(page.parentId) ? page.parentId : null;
        const siblings = tree.children(parent).filter((s) => s.id !== dragId);
        const i = siblings.findIndex((s) => s.id === page.id);
        const neighbor = z === "before" ? siblings[i - 1] : siblings[i + 1];
        const order = neighbor ? (neighbor.order + page.order) / 2 : page.order + (z === "before" ? -1000 : 1000);
        await movePage(dragId, parent, order);
      }
    } catch (e) {
      toastError(e);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    const n = kids.length;
    if (!confirm(`Delete “${page.title || "Untitled"}”${n ? " and the notes inside it" : ""}? This can't be undone.`)) return;
    try {
      if (activeId && (activeId === page.id || tree.isInside(activeId, page.id))) router.push("/");
      await deletePage(page.id);
      toast("Note deleted");
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/note-id", page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("text/note-id")) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          const y = (e.clientY - r.top) / r.height;
          setZone(y < 0.28 ? "before" : y > 0.72 ? "after" : "inside");
        }}
        onDragLeave={() => setZone(null)}
        onDrop={(e) => {
          e.preventDefault();
          const z = zone;
          setZone(null);
          const id = e.dataTransfer.getData("text/note-id");
          if (id && z) drop(id, z);
        }}
        className={cn(
          "group relative flex h-7 items-center gap-1 rounded pr-1 transition-colors hover:bg-hover",
          active && "bg-active text-fg",
          zone === "inside" && "bg-accent-soft",
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {zone === "before" && <div className="absolute inset-x-2 top-0 h-0.5 rounded bg-accent" />}
        {zone === "after" && <div className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}

        <IconButton onClick={() => toggle(page.id)} className="h-5 w-5" aria-label={isOpen ? "Collapse" : "Expand"}>
          <ChevronRight size={14} className={cn("transition-transform", isOpen && "rotate-90", !kids.length && "opacity-40")} />
        </IconButton>
        <Link href={`/notes/${page.id}`} draggable={false} className="flex min-w-0 flex-1 items-center gap-1.5 py-1">
          <span className="flex w-5 shrink-0 justify-center text-[15px] leading-none">
            {page.icon || <FileText size={15} className="text-muted" />}
          </span>
          <span className={cn("truncate", active && "font-medium", !page.title && "text-faint")}>
            {page.title || "Untitled"}
          </span>
        </Link>
        <div className={cn("flex items-center opacity-0 group-hover:opacity-100", menuOpen && "opacity-100")}>
          <IconButton ref={setMoreEl} onClick={() => setMenuOpen((o) => !o)} className="h-5 w-5" title="More">
            <MoreHorizontal size={14} />
          </IconButton>
          <IconButton
            onClick={() => {
              open(page.id);
              newNote(page.id);
            }}
            className="h-5 w-5"
            title="Add a page inside"
          >
            <Plus size={14} />
          </IconButton>
        </div>
        <Popover anchor={moreEl} open={menuOpen} onClose={() => setMenuOpen(false)} className="w-48">
          <MenuItem
            icon={<FilePlus2 size={14} />}
            onClick={() => {
              setMenuOpen(false);
              open(page.id);
              newNote(page.id);
            }}
          >
            Add page inside
          </MenuItem>
          <MenuItem icon={<Trash2 size={14} />} danger onClick={remove}>
            Delete
          </MenuItem>
        </Popover>
      </div>

      {isOpen && (
        <div>
          {kids.length === 0 ? (
            <div className="py-1 text-xs text-faint" style={{ paddingLeft: 30 + (depth + 1) * 14 }}>
              No pages inside
            </div>
          ) : (
            kids.map((k) => (
              <NoteRow key={k.id} page={k} depth={depth + 1} tree={tree} activeId={activeId} expanded={expanded} toggle={toggle} open={open} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Thin top bar for screens; leaves room for the sidebar toggle when collapsed. */
export function TopBar({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  const { sidebarOpen } = useShell();
  return (
    <header className={cn("flex h-11 shrink-0 items-center gap-2 px-3 text-sm", !sidebarOpen && "pl-11")}>
      <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>
      {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
    </header>
  );
}
