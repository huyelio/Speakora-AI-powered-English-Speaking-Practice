import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import { HeaderActions } from "./header-actions";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/dashboard">
          <span aria-hidden="true" className="brand-mark">
            <svg fill="none" viewBox="0 0 32 32"><path d="M7 17.5v-3M12 22v-12M17 25V7M22 21.5v-11M27 17v-2" /></svg>
          </span>
          speakora
        </Link>
        <Navigation />
        <HeaderActions />
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
