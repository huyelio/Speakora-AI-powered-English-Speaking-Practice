"use client";

import { AudioLines, BookOpen, GraduationCap, LayoutDashboard, MessagesSquare, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/dashboard", label: "Trang chủ", Icon: LayoutDashboard },
  { href: "/vocabulary", label: "Từ vựng", Icon: BookOpen },
  { href: "/pronunciation", label: "Phát âm", Icon: AudioLines },
  { href: "/explore", label: "Giao tiếp theo chủ đề", Icon: MessagesSquare },
  { href: "/demo/speech", label: "Luyện thi IELTS", Icon: GraduationCap },
  { href: "/profile",   label: "Hồ sơ",     Icon: User },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="app-navigation">
      {navigationItems.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
          || (href === "/explore" && (pathname.startsWith("/topics/") || pathname.startsWith("/practice/")))
          || (href === "/profile" && pathname.startsWith("/history"));
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
