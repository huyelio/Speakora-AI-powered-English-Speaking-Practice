import { Brand } from "../ui/brand";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import { HeaderActions } from "./header-actions";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand compact href="/dashboard" />
        <Navigation />
        <HeaderActions />
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
