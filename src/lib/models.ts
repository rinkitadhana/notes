import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pageSchema = new Schema(
  {
    title: { type: String, default: "" },
    icon: { type: String, default: "" },
    content: { type: Schema.Types.Mixed, default: [] },
    text: { type: String, default: "" }, // plain text, for search + previews
    parentId: { type: Schema.Types.ObjectId, ref: "Page", default: null, index: true },
    order: { type: Number, default: () => Date.now() },
    openedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, minimize: false },
);

const todoSchema = new Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    due: { type: String, default: null }, // YYYY-MM-DD
    priority: { type: Number, default: 0, min: 0, max: 3 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const fileSchema = new Schema(
  {
    name: { type: String, default: "file" },
    type: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export type PageDoc = InferSchemaType<typeof pageSchema> & { _id: mongoose.Types.ObjectId };
export type TodoDoc = InferSchemaType<typeof todoSchema> & { _id: mongoose.Types.ObjectId };
export type FileDoc = InferSchemaType<typeof fileSchema> & { _id: mongoose.Types.ObjectId };

export const Page: Model<PageDoc> =
  (mongoose.models.Page as Model<PageDoc>) ?? mongoose.model<PageDoc>("Page", pageSchema);
export const Todo: Model<TodoDoc> =
  (mongoose.models.Todo as Model<TodoDoc>) ?? mongoose.model<TodoDoc>("Todo", todoSchema);
export const StoredFile: Model<FileDoc> =
  (mongoose.models.StoredFile as Model<FileDoc>) ?? mongoose.model<FileDoc>("StoredFile", fileSchema);
