import React from "react";
import Link from "next/link";
import { List, MessagesSquare } from "lucide-react";

/** Speaking hub modes. Both live under /speaking; conversation sessions keep /speaking/conversation. */
export function SpeakingTabs({ active }: { active: "topics" | "roleplay" }) {
  return <nav className="a5-mode-tabs" aria-label="Chế độ luyện nói">
    <Link href="/speaking?tab=topics" aria-current={active === "topics" ? "page" : undefined}><List aria-hidden="true" size={17} />Theo chủ đề</Link>
    <Link href="/speaking?tab=roleplay" aria-current={active === "roleplay" ? "page" : undefined}><MessagesSquare aria-hidden="true" size={17} />Hội thoại AI</Link>
  </nav>;
}
