"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="app-navigation">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link aria-current={isActive ? "page" : undefined} className={isActive ? "active" : undefined} href={item.href} key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
