import Image from "next/image";
import { MessageCircle } from "lucide-react";
import React from "react";

const topicIllustrations: Record<string, string> = {
  community: "/images/topics/community.webp",
  "daily-routine": "/images/topics/daily-routine.webp",
  "family-friends": "/images/topics/family-friends.webp",
  "family-and-friends": "/images/topics/family-friends.webp",
  "food-cooking": "/images/topics/food-cooking.webp",
  "food-and-cooking": "/images/topics/food-cooking.webp",
  "future-plans": "/images/topics/future-plans.webp",
  "health-fitness": "/images/topics/health-fitness.webp",
  "health-and-fitness": "/images/topics/health-fitness.webp",
  hobbies: "/images/topics/hobbies.webp",
  "home-neighborhood": "/images/topics/home-neighborhood.webp",
  "home-and-neighborhood": "/images/topics/home-neighborhood.webp",
  "movies-music": "/images/topics/movies-music.webp",
  "movies-and-music": "/images/topics/movies-music.webp",
  shopping: "/images/topics/shopping.webp",
  study: "/images/topics/study.webp",
  "social-situations": "/images/topics/social-situations.webp",
  transportation: "/images/topics/transportation.webp",
  travel: "/images/topics/travel.webp",
  technology: "/images/topics/technology.webp",
  education: "/images/topics/education.webp",
  work: "/images/topics/work.webp",
};

function normalizeTopicKey(value: string) {
  return value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getTopicIllustration(slug: string, name: string) {
  return topicIllustrations[normalizeTopicKey(slug)] ?? topicIllustrations[normalizeTopicKey(name)];
}

export function TopicIllustration({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const illustration = getTopicIllustration(slug, name);
  const classes = [className, "session-topic-thumbnail", illustration ? "" : "is-fallback"].filter(Boolean).join(" ");

  return (
    <span aria-hidden="true" className={classes}>
      {illustration
        ? <Image alt="" height={64} src={illustration} unoptimized width={64} />
        : <MessageCircle size={22} />}
    </span>
  );
}
