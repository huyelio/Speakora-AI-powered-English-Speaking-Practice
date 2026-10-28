import { Suspense, type ReactNode } from "react";
import { Wordmark } from "../ui/brand";
import { AccountArea } from "./account-area";
import { Navigation } from "./navigation";
import "./app-shell.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell a5-shell">
      <header className="a5-top">
        <div className="a5-stripes" aria-hidden="true" />
        <div className="a5-top-in">
          <Wordmark />
          <Navigation />
          <Suspense fallback={<span className="a5-account-fallback" aria-hidden="true" />}>
            <AccountArea />
          </Suspense>
        </div>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
