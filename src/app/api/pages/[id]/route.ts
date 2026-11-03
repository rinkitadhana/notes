import { Page, type PageDoc } from "@/lib/models";
import { blocksToText, pageFull, pageMeta } from "@/lib/serialize";
import { bad, descendants, handle, json, oid } from "@/lib/server";

type Ctx = RouteContext<"/api/pages/[id]">;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  // Opening a page bumps it to the top of "recently opened".
  const page = await Page.findByIdAndUpdate(
    id,
    { $set: { openedAt: new Date() } },
    { returnDocument: "after", timestamps: false },
  ).lean<PageDoc>();
  if (!page) return bad("Not found", 404);
  return json(pageFull(page));
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  const body = (await req.json()) as Record<string, unknown>;
  const set: Record<string, unknown> = {};

  if (typeof body.title === "string") set.title = body.title;
  if (typeof body.icon === "string") set.icon = body.icon;
  if (typeof body.order === "number" && Number.isFinite(body.order)) set.order = body.order;
  if (Array.isArray(body.content)) {
    set.content = body.content;
    set.text = blocksToText(body.content);
  }
  if ("parentId" in body) {
    if (body.parentId === null) set.parentId = null;
    else {
      const parentId = oid(body.parentId as string);
      if (!parentId) return bad("Invalid parentId");
      if (parentId.equals(id) || (await descendants(id)).some((d) => d.equals(parentId)))
        return bad("Can't move a page inside itself");
      set.parentId = parentId;
    }
  }

  const page = await Page.findByIdAndUpdate(id, { $set: set }, { returnDocument: "after", projection: { content: 0 } }).lean<PageDoc>();
  if (!page) return bad("Not found", 404);
  return json(pageMeta(page));
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  const ids = [id, ...(await descendants(id))];
  await Page.deleteMany({ _id: { $in: ids } });
  return json({ ok: true, deleted: ids.map(String) });
});
