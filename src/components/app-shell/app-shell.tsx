import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/dashboard">
          <span aria-hidden="true" className="brand-mark">S</span>
          Speakora
        </Link>
        <Navigation />
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
