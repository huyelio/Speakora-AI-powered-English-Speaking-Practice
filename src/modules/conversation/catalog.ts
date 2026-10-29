import { conversationScenarios, type ConversationScenario } from "./scenario";

/**
 * Catalog card copy. Cover art comes from `npm run conversation:art`. Display only: sessions snapshot the scenario itself,
 * so nothing here is saved or sent to the model.
 */
type CardContent = { title: string; summary: string };

const cards: Record<string, CardContent> = {
  "airplane-chat-v1": { title: "Trò chuyện trên máy bay", summary: "Kể với hành khách ngồi cạnh về nơi bạn đến và điều bạn mong đợi." },
  "ordering-at-a-cafe-v1": { title: "Gọi đồ ở quán cà phê", summary: "Gọi đồ uống, món ăn và nêu yêu cầu riêng của bạn." },
  "hotel-check-in-v1": { title: "Nhận phòng khách sạn", summary: "Làm thủ tục nhận phòng và hỏi về dịch vụ trong kỳ lưu trú." },
  "restaurant-problem-v1": { title: "Sự cố ở nhà hàng", summary: "Lịch sự trình bày vấn đề với món ăn và cùng tìm cách giải quyết." },
  "party-meeting-v1": { title: "Làm quen ở bữa tiệc", summary: "Giới thiệu bản thân và tìm chủ đề chung với người mới gặp." },
  "first-day-at-work-v1": { title: "Ngày đầu đi làm", summary: "Làm quen đồng nghiệp mới và hỏi những điều cần biết." },
  "first-date-v1": { title: "Buổi hẹn đầu tiên", summary: "Phá vỡ khoảng lặng và tìm hiểu đối phương một cách tự nhiên." },
  "awkward-remark-v1": { title: "Lỡ lời", summary: "Giải thích ý bạn muốn nói và làm cuộc trò chuyện dễ chịu trở lại." },
  "apologizing-after-argument-v1": { title: "Xin lỗi sau cuộc cãi vã", summary: "Nói về chuyện đã xảy ra và hàn gắn tình bạn." },
  "reconnecting-v1": { title: "Gặp lại người quen cũ", summary: "Hỏi han chuyện đã qua và để câu chuyện tự nhiên tiếp diễn." },
};

export type ScenarioCard = {
  key: string;
  title: string;
  /** Original English title, shown small and searchable. */
  englishTitle: string;
  summary: string;
  image: string;
  category: ConversationScenario["category"];
  difficulty: ConversationScenario["difficulty"];
};

export function scenarioCard(scenario: ConversationScenario): ScenarioCard {
  const content = cards[scenario.key];
  return {
    key: scenario.key,
    title: content?.title ?? scenario.title,
    englishTitle: scenario.title,
    summary: content?.summary ?? scenario.description,
    image: `/images/conversation/${scenario.key}.webp`,
    category: scenario.category,
    difficulty: scenario.difficulty,
  };
}

export const scenarioCards: readonly ScenarioCard[] = conversationScenarios.map(scenarioCard);

/** Portrait of the AI partner (`npm run conversation:art -- --avatars`); undefined for keys outside the catalog. */
export function scenarioAvatar(key: string): string | undefined {
  return key in cards ? `/images/conversation/avatars/${key}.webp` : undefined;
}
