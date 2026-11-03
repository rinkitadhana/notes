export type PageMeta = {
  id: string;
  title: string;
  icon: string;
  excerpt: string;
  parentId: string | null;
  order: number;
  openedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PageFull = PageMeta & { content: unknown[] };

export type Priority = 0 | 1 | 2 | 3;

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  due: string | null; // YYYY-MM-DD
  priority: Priority;
  completedAt: string | null;
  createdAt: string;
};
