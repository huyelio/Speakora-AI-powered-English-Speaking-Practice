export type NavSection = "home" | "vocabulary" | "speaking" | "ielts" | "account";

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
  { section: "home", href: "/dashboard", label: "Trang chủ", shortLabel: "Trang chủ" },
  { section: "vocabulary", href: "/vocabulary", label: "Từ vựng", shortLabel: "Từ vựng" },
  { section: "speaking", href: "/speaking", label: "Luyện nói", shortLabel: "Luyện nói" },
  { section: "ielts", href: "/ielts", label: "Luyện thi IELTS", shortLabel: "IELTS" },
  { section: "account", href: "/profile", label: "Hồ sơ", shortLabel: "Hồ sơ", mobileOnly: true },
];

// Session URLs keep their historical paths, so each section claims them too.
const sectionPrefixes: Readonly<Record<NavSection, readonly string[]>> = {
  home: ["/dashboard"],
  vocabulary: ["/vocabulary", "/vocabulary-learning", "/pronunciation"],
  speaking: ["/speaking", "/explore", "/topics", "/practice"],
  ielts: ["/ielts", "/demo/speech"],
  account: ["/profile", "/history"],
};

export function activeSection(pathname: string): NavSection | null {
  for (const [section, prefixes] of Object.entries(sectionPrefixes) as [NavSection, readonly string[]][]) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return section;
  }
  return null;
}
