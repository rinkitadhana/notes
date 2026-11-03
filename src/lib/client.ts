"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { PageFull, PageMeta, Todo } from "./types";

export async function api<T>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

const fetcher = <T,>(url: string) => api<T>(url);

/**
 * Patch a cached list without refetching. If nothing is cached yet, a local
 * mutate would make SWR drop the in-flight first load, so refetch instead.
 */
async function patchKey<T>(key: string, fn: (cur: T) => T) {
  const res = await globalMutate<T>(key, (cur) => (cur === undefined ? cur : fn(cur)), { revalidate: false });
  if (res === undefined) await globalMutate(key);
}

/* ---------------- pages ---------------- */

const PAGES = "/api/pages";

export function usePages() {
  const { data, error, isLoading } = useSWR<PageMeta[]>(PAGES, fetcher);
  return { pages: data ?? [], error, isLoading };
}

export function usePage(id: string) {
  return useSWR<PageFull>(`${PAGES}/${id}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
}

const patchPages = (fn: (ps: PageMeta[]) => PageMeta[]) => patchKey<PageMeta[]>(PAGES, fn);

/** Update list metadata locally (sidebar, home) without a request. */
export const patchPageLocal = (id: string, meta: Partial<PageMeta>) =>
  patchPages((ps) => ps.map((p) => (p.id === id ? { ...p, ...meta } : p)));

/** Keep the cached full page in sync with the editor. */
export const patchPageFullLocal = (id: string, patch: Partial<PageFull>) =>
  globalMutate<PageFull>(`${PAGES}/${id}`, (cur) => (cur ? { ...cur, ...patch } : cur), { revalidate: false });
// (the full page is always loaded before the editor can call this)

export async function createPage(input: { parentId?: string | null; title?: string } = {}) {
  const page = await api<PageMeta>(PAGES, { method: "POST", body: input });
  await patchPages((ps) => [...ps, page]);
  return page;
}

export async function savePage(id: string, patch: { title?: string; icon?: string; content?: unknown[]; parentId?: string | null; order?: number }) {
  const saved = await api<PageMeta>(`${PAGES}/${id}`, { method: "PATCH", body: patch });
  // Local state may be ahead of this response; only take server-derived fields.
  await patchPageLocal(id, {
    updatedAt: saved.updatedAt,
    excerpt: saved.excerpt,
    ...("parentId" in patch ? { parentId: saved.parentId, order: saved.order } : {}),
  });
  return saved;
}

export async function movePage(id: string, parentId: string | null, order: number) {
  await patchPageLocal(id, { parentId, order });
  try {
    await savePage(id, { parentId, order });
  } catch (e) {
    await globalMutate(PAGES);
    throw e;
  }
}

export async function deletePage(id: string) {
  const res = await api<{ deleted: string[] }>(`${PAGES}/${id}`, { method: "DELETE" });
  await patchPages((ps) => ps.filter((p) => !res.deleted.includes(p.id)));
}

/** Mark a page as opened now so it floats to the top of "recently opened". */
export const touchPageLocal = (id: string) => patchPageLocal(id, { openedAt: new Date().toISOString() });

/* ---------------- todos ---------------- */

const TODOS = "/api/todos";

export function useTodos() {
  const { data, error, isLoading } = useSWR<Todo[]>(TODOS, fetcher);
  return { todos: data ?? [], error, isLoading };
}

const patchTodos = (fn: (ts: Todo[]) => Todo[]) => patchKey<Todo[]>(TODOS, fn);

export async function createTodo(input: { title: string; due?: string | null; priority?: number }) {
  const tempId = `temp-${Math.random().toString(36).slice(2)}`;
  const temp: Todo = {
    id: tempId,
    title: input.title,
    done: false,
    due: input.due ?? null,
    priority: (input.priority ?? 0) as Todo["priority"],
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  await patchTodos((ts) => [temp, ...ts]);
  try {
    const t = await api<Todo>(TODOS, { method: "POST", body: input });
    await patchTodos((ts) => ts.map((x) => (x.id === tempId ? t : x)));
    return t;
  } catch (e) {
    await patchTodos((ts) => ts.filter((x) => x.id !== tempId));
    throw e;
  }
}

export async function updateTodo(id: string, patch: Partial<Omit<Todo, "id">>) {
  const optimistic: Partial<Todo> = { ...patch };
  if ("done" in patch) optimistic.completedAt = patch.done ? new Date().toISOString() : null;
  await patchTodos((ts) => ts.map((t) => (t.id === id ? { ...t, ...optimistic } : t)));
  try {
    const t = await api<Todo>(`${TODOS}/${id}`, { method: "PATCH", body: patch });
    await patchTodos((ts) => ts.map((x) => (x.id === id ? t : x)));
  } catch (e) {
    await globalMutate(TODOS);
    throw e;
  }
}

export async function deleteTodo(id: string) {
  await patchTodos((ts) => ts.filter((t) => t.id !== id));
  try {
    await api(`${TODOS}/${id}`, { method: "DELETE" });
  } catch (e) {
    await globalMutate(TODOS);
    throw e;
  }
}
