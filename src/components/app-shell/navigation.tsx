"use client";

import { Compass, History, LayoutDashboard, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/dashboard", label: "Trang chủ", Icon: LayoutDashboard },
  { href: "/explore",   label: "Khám phá",  Icon: Compass },
  { href: "/history",   label: "Lịch sử",   Icon: History },
  { href: "/profile",   label: "Hồ sơ",     Icon: User },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="app-navigation">
      {navigationItems.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "active" : undefined}
            href={href}
            key={href}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
