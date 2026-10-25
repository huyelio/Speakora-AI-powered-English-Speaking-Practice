import React from "react";
import Link from "next/link";
import styles from "./conversation.module.css";

export function SpeakingTabs({ active }: { active: "topics" | "roleplay" }) {
  return <nav className={styles.tabs} aria-label="Chế độ Speaking">
    <Link href="/explore" aria-current={active === "topics" ? "page" : undefined}>Theo chủ đề</Link>
    <Link href="/speaking/conversation" aria-current={active === "roleplay" ? "page" : undefined}>AI Role-play</Link>
  </nav>;
}
