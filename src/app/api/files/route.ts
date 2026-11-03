import { StoredFile } from "@/lib/models";
import { bad, handle, json } from "@/lib/server";

const MAX = 12 * 1024 * 1024; // under Mongo's 16MB document limit

export const POST = handle(async (req: Request) => {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return bad("No file");
  if (file.size > MAX) return bad("File too large (max 12MB)", 413);
  const doc = await StoredFile.create({
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    data: Buffer.from(await file.arrayBuffer()),
  });
  return json({ url: `/api/files/${doc._id}` }, 201);
});
