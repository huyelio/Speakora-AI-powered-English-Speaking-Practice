import React from "react";
import Image from "next/image";
import { MessagesSquare } from "lucide-react";

const topics = new Set([
  "daily-routine", "family-friends", "food-cooking", "shopping", "travel",
  "transportation", "work", "study", "hobbies", "movies-music",
  "health-fitness", "technology", "home-neighborhood", "social-situations", "future-plans",
  "community", "education",
]);

export function TopicIcon({ slug, size = 64 }: { slug: string; size?: number }) {
  const assetSlug = slug.replace(/-and-/g, "-");
  return (
    <span className={`topic-art topic-art-${assetSlug}`} aria-hidden="true" style={{ width: size, height: size }}>
      {topics.has(assetSlug)
        ? <Image src={`/images/topics/${assetSlug}.webp`} alt="" width={size} height={size} sizes={`${size}px`} />
        : <MessagesSquare size={Math.round(size * .6)} />}
    </span>
  );
}
