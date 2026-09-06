export type TopicPresentation = {
  context: string;
  vocabulary: string[];
};

const presentations: Record<string, TopicPresentation> = {
  "daily-routine": {
    context: "Luyện mô tả thói quen, lịch trình và một ngày thường của bạn.",
    vocabulary: ["daily routine", "usually", "wind down"],
  },
  "family-friends": {
    context: "Luyện nói về các mối quan hệ, trải nghiệm chung và những người quan trọng với bạn.",
    vocabulary: ["get along", "supportive", "have in common"],
  },
  "food-cooking": {
    context: "Luyện nói về món ăn, sở thích nấu nướng và trải nghiệm ẩm thực hằng ngày.",
    vocabulary: ["ingredients", "homemade", "seasoning"],
  },
  shopping: {
    context: "Luyện mô tả việc mua sắm, sở thích và các cuộc trò chuyện thường gặp tại cửa hàng.",
    vocabulary: ["good value", "compare prices", "return policy"],
  },
  travel: {
    context: "Luyện nói về kế hoạch, hành trình và những tình huống thường gặp khi đi du lịch.",
    vocabulary: ["itinerary", "accommodation", "get around"],
  },
  transportation: {
    context: "Luyện nói về hành trình, phương tiện và cách di chuyển giữa các địa điểm.",
    vocabulary: ["commute", "public transport", "traffic congestion"],
  },
  work: {
    context: "Luyện nói về trách nhiệm, tình huống nơi làm việc và mục tiêu nghề nghiệp.",
    vocabulary: ["deadline", "workload", "collaborate"],
  },
  study: {
    context: "Luyện chia sẻ về thói quen học tập, môn học và trải nghiệm giáo dục.",
    vocabulary: ["assignment", "revise", "make progress"],
  },
  hobbies: {
    context: "Luyện chia sẻ sở thích, hoạt động lúc rảnh và điều khiến bạn yêu thích chúng.",
    vocabulary: ["take up", "spare time", "rewarding"],
  },
  "movies-music": {
    context: "Luyện nêu ý kiến về nội dung giải trí, nghệ sĩ và những tác phẩm đáng nhớ.",
    vocabulary: ["soundtrack", "performance", "thought-provoking"],
  },
  "health-fitness": {
    context: "Luyện nói về thói quen lành mạnh, tập thể dục và sức khỏe hằng ngày.",
    vocabulary: ["balanced diet", "work out", "wellbeing"],
  },
  technology: {
    context: "Luyện giải thích cách công nghệ ảnh hưởng đến thói quen, giao tiếp và lựa chọn của bạn.",
    vocabulary: ["user-friendly", "device", "stay connected"],
  },
  "home-neighborhood": {
    context: "Luyện mô tả nơi ở, các địa điểm gần nhà và cuộc sống trong khu phố.",
    vocabulary: ["residential area", "nearby", "local amenities"],
  },
  "social-situations": {
    context: "Luyện phản hồi tự nhiên khi làm quen, nhận lời mời và giao tiếp hằng ngày.",
    vocabulary: ["make small talk", "catch up", "feel at ease"],
  },
  "future-plans": {
    context: "Luyện chia sẻ dự định, hy vọng và quyết định cho tương lai.",
    vocabulary: ["look forward to", "long-term goal", "intend to"],
  },
};

export function getTopicPresentation(slug: string, name: string): TopicPresentation {
  return presentations[slug] ?? {
    context: `Luyện diễn đạt ý tưởng tự nhiên khi trò chuyện về ${name}.`,
    vocabulary: [],
  };
}
