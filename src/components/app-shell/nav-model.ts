import { msg } from "../../i18n/translate";
export type NavSection = "home" | "vocabulary" | "speaking" | "conversation" | "ielts" | "account";

export type NavItem = {
  section: NavSection;
  href: string;
  label: string;
  /** Bottom tab bar label (mobile). */
  shortLabel: string;
  /** Account lives in the avatar menu on wider screens. */
  mobileOnly?: boolean;
};

export const navItems: readonly NavItem[] = [
  { section: "home", href: "/dashboard", label: msg("Trang chủ"), shortLabel: msg("Trang chủ") },
  { section: "vocabulary", href: "/vocabulary", label: msg("Từ vựng"), shortLabel: msg("Từ vựng") },
  { section: "speaking", href: "/speaking", label: msg("Luyện nói"), shortLabel: msg("Luyện nói") },
  { section: "conversation", href: "/conversation", label: msg("Hội thoại AI"), shortLabel: msg("Hội thoại") },
  { section: "ielts", href: "/ielts", label: msg("Luyện thi IELTS"), shortLabel: "IELTS" },
  { section: "account", href: "/profile", label: msg("Hồ sơ"), shortLabel: msg("Hồ sơ"), mobileOnly: true },
];

// Session URLs keep their historical paths, so each section claims them too.
const sectionPrefixes: Readonly<Record<NavSection, readonly string[]>> = {
  home: ["/dashboard"],
  vocabulary: ["/vocabulary", "/vocabulary-learning", "/pronunciation"],
  speaking: ["/speaking", "/explore", "/topics", "/practice"],
  conversation: ["/conversation"],
  ielts: ["/ielts", "/demo/speech"],
  account: ["/profile", "/history", "/leaderboard"],
};

export function activeSection(pathname: string): NavSection | null {
  for (const [section, prefixes] of Object.entries(sectionPrefixes) as [NavSection, readonly string[]][]) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return section;
  }
  return null;
}
