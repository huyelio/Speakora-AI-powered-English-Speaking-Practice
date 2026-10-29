import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/vocabulary-learning/3f1c" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("../../modules/auth/actions", () => ({ signOut: vi.fn() }));

import { HeaderActions } from "./header-actions";
import { Navigation } from "./navigation";

describe("Navigation", () => {
  it("marks only the section that owns the current session URL", () => {
    const html = renderToStaticMarkup(<Navigation />);

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*data-section="vocabulary"/);
    expect(html).toContain('aria-label="Điều hướng chính"');
  });

  it("keeps a visible label in the accessible name of every tab", () => {
    pathname.value = "/dashboard";
    const html = renderToStaticMarkup(<Navigation />);

    for (const label of ["Trang chủ", "Từ vựng", "Luyện nói", "Hội thoại AI", "Luyện thi IELTS", "Hồ sơ"]) {
      expect(html).toContain(`<span class="a5-nav-label">${label}</span>`);
    }
    expect(html).toContain('class="a5-nav-mobile-only"');
  });
});

describe("HeaderActions", () => {
  it("renders a closed account menu with profile, history and sign-out", () => {
    const html = renderToStaticMarkup(<HeaderActions displayName="lan" streak={6} />);

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Tài khoản của lan"');
    expect(html).toMatch(/class="a5-menu" hidden=""/);
    expect(html).toContain('href="/profile"');
    expect(html).toContain('href="/history"');
    expect(html).toContain("Đăng xuất");
    expect(html).toContain("6 ngày</span>");
    expect(html).toContain(">L</span>");
  });

  it("omits the streak chip when the streak could not be loaded", () => {
    const html = renderToStaticMarkup(<HeaderActions displayName="" streak={null} />);

    expect(html).not.toContain("a5-streak");
    expect(html).toContain('aria-label="Tài khoản của bạn"');
  });
});
