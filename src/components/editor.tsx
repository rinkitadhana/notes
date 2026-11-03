"use client";

import "@blocknote/mantine/style.css";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";
import { useTheme } from "next-themes";

async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

export type EditorHandle = BlockNoteEditor;

export default function Editor({
  initial,
  onChange,
  onReady,
}: {
  initial: unknown[];
  onChange: (blocks: unknown[]) => void;
  onReady?: (editor: EditorHandle) => void;
}) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({
    initialContent: initial.length ? (initial as PartialBlock[]) : undefined,
    uploadFile,
  });

  useEffect(() => {
    onReady?.(editor as unknown as EditorHandle);
  }, [editor, onReady]);

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => onChange(editor.document)}
    />
  );
}
