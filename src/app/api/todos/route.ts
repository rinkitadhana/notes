import { connection } from "next/server";
import { Todo, type TodoDoc } from "@/lib/models";
import { todo } from "@/lib/serialize";
import { bad, handle, json } from "@/lib/server";

export const GET = handle(async () => {
  await connection();
  const todos = await Todo.find().sort({ createdAt: -1 }).lean<TodoDoc[]>();
  return json(todos.map(todo));
});

export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { title?: string; due?: string | null; priority?: number };
  const title = body.title?.trim();
  if (!title) return bad("Title is required");
  const t = await Todo.create({
    title,
    due: /^\d{4}-\d{2}-\d{2}$/.test(body.due ?? "") ? body.due : null,
    priority: Math.max(0, Math.min(3, Number(body.priority) || 0)),
  });
  return json(todo(t.toObject() as TodoDoc), 201);
});
