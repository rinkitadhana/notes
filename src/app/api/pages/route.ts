import { connection } from "next/server";
import { Page, type PageDoc } from "@/lib/models";
import { pageMeta } from "@/lib/serialize";
import { bad, handle, json, oid } from "@/lib/server";

export const GET = handle(async () => {
  await connection();
  const pages = await Page.find({}, { content: 0 }).sort({ order: 1 }).lean<PageDoc[]>();
  return json(pages.map(pageMeta));
});

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { parentId?: string | null; title?: string };
  const parentId = body.parentId ? oid(body.parentId) : null;
  if (body.parentId && !parentId) return bad("Invalid parentId");
  const page = await Page.create({ title: body.title ?? "", parentId });
  return json(pageMeta(page.toObject() as PageDoc), 201);
});
