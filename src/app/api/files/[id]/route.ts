import { StoredFile, type FileDoc } from "@/lib/models";
import { bad, handle, oid } from "@/lib/server";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/files/[id]">) => {
  const id = oid((await ctx.params).id);
  if (!id) return bad("Not found", 404);
  const f = await StoredFile.findById(id).lean<FileDoc>();
  if (!f) return bad("Not found", 404);
  const raw = f.data as unknown as Buffer | { buffer: ArrayBuffer };
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": f.type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
