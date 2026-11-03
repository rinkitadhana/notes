import { Todo, type TodoDoc } from "@/lib/models";
import { todo } from "@/lib/serialize";
import { bad, handle, json, oid } from "@/lib/server";

type Ctx = RouteContext<"/api/todos/[id]">;

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  const body = (await req.json()) as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) set.title = body.title.trim();
  if (typeof body.priority === "number") set.priority = Math.max(0, Math.min(3, Math.round(body.priority)));
  if ("due" in body) set.due = typeof body.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due) ? body.due : null;
  if (typeof body.done === "boolean") {
    set.done = body.done;
    set.completedAt = body.done ? new Date() : null;
  }
  const t = await Todo.findByIdAndUpdate(id, { $set: set }, { returnDocument: "after" }).lean<TodoDoc>();
  if (!t) return bad("Not found", 404);
  return json(todo(t));
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  await Todo.deleteOne({ _id: id });
  return json({ ok: true });
});
