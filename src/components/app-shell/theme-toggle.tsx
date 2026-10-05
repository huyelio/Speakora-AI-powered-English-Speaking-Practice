"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    syncTheme();
    window.addEventListener("speakora-theme-change", syncTheme);
    return () => window.removeEventListener("speakora-theme-change", syncTheme);
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    window.dispatchEvent(new Event("speakora-theme-change"));
    try { localStorage.setItem("speakora-theme", next); } catch { /* Theme still works when storage is blocked. */ }
  }

  const label = theme === null ? "Đổi giao diện sáng / tối" : theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  return (
    <button className="header-control theme-toggle" onClick={toggle} type="button" aria-label={label} title={label}>
      <Sun className="theme-sun" size={18} aria-hidden="true" />
      <Moon className="theme-moon" size={18} aria-hidden="true" />
    </button>
  );
}
