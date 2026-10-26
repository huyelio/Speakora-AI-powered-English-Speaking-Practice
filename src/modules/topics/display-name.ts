// Vietnamese labels for topic names shown in navigation-level UI. Stored topic
// names stay English (they are learning content and API data); unknown slugs fall back.
const vietnameseTopicNames: Readonly<Record<string, string>> = {
  "daily-routine": "Thói quen hằng ngày",
  "family-and-friends": "Gia đình & bạn bè",
  "food-and-cooking": "Ẩm thực & nấu ăn",
  "future-plans": "Kế hoạch tương lai",
  "health-and-fitness": "Sức khỏe & thể chất",
  hobbies: "Sở thích",
  "home-and-neighborhood": "Nhà & khu phố",
  "movies-and-music": "Phim & âm nhạc",
  shopping: "Mua sắm",
  "social-situations": "Giao tiếp xã hội",
  study: "Học tập",
  technology: "Công nghệ",
  transportation: "Phương tiện đi lại",
  travel: "Du lịch",
  work: "Công việc",
  community: "Cộng đồng",
};

export function topicDisplayName(slug: string, fallback: string): string {
  return vietnameseTopicNames[slug] ?? fallback;
}
