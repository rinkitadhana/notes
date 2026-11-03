import { isValidObjectId, Types } from "mongoose";
import { db } from "./db";
import { Page } from "./models";

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });

export function oid(id: string | null | undefined) {
  return id && isValidObjectId(id) ? new Types.ObjectId(id) : null;
}

/** All descendant ids of a page (not including itself). */
export async function descendants(id: Types.ObjectId) {
  const all: Types.ObjectId[] = [];
  let frontier = [id];
  while (frontier.length) {
    const kids = await Page.find({ parentId: { $in: frontier } }, { _id: 1 }).lean();
    frontier = kids.map((k) => k._id);
    all.push(...frontier);
  }
  return all;
}

/** Wraps a handler so DB errors become clean JSON 500s. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await db();
      return await fn(...args);
    } catch (e) {
      console.error(e);
      return bad(e instanceof Error ? e.message : "Server error", 500);
    }
  };
}
