"use client";

import { BookOpen, CircleUserRound, GraduationCap, House, Mic, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { activeSection, navItems, type NavSection } from "./nav-model";

const icons: Record<NavSection, LucideIcon> = {
  home: House,
  vocabulary: BookOpen,
  speaking: Mic,
  ielts: GraduationCap,
  account: CircleUserRound,
};

/** Pill tabs on wide screens; the same landmark becomes the bottom tab bar on phones. */
export function Navigation() {
  const current = activeSection(usePathname() ?? "");

  return (
    <nav aria-label="Điều hướng chính" className="a5-nav">
      {navItems.map(({ section, href, label, shortLabel, mobileOnly }) => {
        const Icon = icons[section];
        const isActive = section === current;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={mobileOnly ? "a5-nav-mobile-only" : undefined}
            data-section={section}
            href={href}
            key={section}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={isActive ? 2.25 : 1.9} />
            <span className="a5-nav-label">{label}</span>
            <span className="a5-nav-short" aria-hidden="true">{shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
