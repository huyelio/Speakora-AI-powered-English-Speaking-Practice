"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/dashboard", label: "Trang chủ" },
  { href: "/explore", label: "Khám phá" },
  { href: "/history", label: "Lịch sử" },
  { href: "/profile", label: "Hồ sơ" },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="app-navigation">
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
