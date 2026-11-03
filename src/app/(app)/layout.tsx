import { Suspense } from "react";
import { AppShell } from "@/components/shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
