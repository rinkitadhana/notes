import type { PageDoc, TodoDoc } from "./models";
import type { PageFull, PageMeta, Priority, Todo } from "./types";

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? String(d) : null);

export function pageMeta(p: PageDoc): PageMeta {
  return {
    id: String(p._id),
    title: p.title ?? "",
    icon: p.icon ?? "",
    excerpt: (p.text ?? "").slice(0, 160),
    parentId: p.parentId ? String(p.parentId) : null,
    order: p.order ?? 0,
    openedAt: iso(p.openedAt ?? p.updatedAt)!,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}

export function pageFull(p: PageDoc): PageFull {
  return { ...pageMeta(p), content: Array.isArray(p.content) ? p.content : [] };
}

export function todo(t: TodoDoc): Todo {
  return {
    id: String(t._id),
    title: t.title,
    done: !!t.done,
    due: t.due ?? null,
    priority: (t.priority ?? 0) as Priority,
    completedAt: iso(t.completedAt),
    createdAt: iso(t.createdAt)!,
  };
}

/** Plain text out of BlockNote JSON, for search and previews. */
export function blocksToText(blocks: unknown): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "text" && typeof n.text === "string") out.push(n.text);
    if (n.content) walk(n.content);
    if (n.children) walk(n.children);
    if (Array.isArray(n.rows)) for (const r of n.rows as { cells?: unknown[] }[]) walk(r.cells);
  };
  walk(blocks);
  return out.join(" ").replace(/\s+/g, " ").trim().slice(0, 20000);
}
