"use client";

import { useParams } from "next/navigation";
import { NoteView } from "@/components/note-view";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  return <NoteView key={id} id={id} />;
}
