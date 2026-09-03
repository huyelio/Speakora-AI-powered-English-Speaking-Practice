export type TopicPresentation = {
  context: string;
  vocabulary: string[];
};

const presentations: Record<string, TopicPresentation> = {
  "daily-routine": {
    context: "Practice describing habits, schedules, and the way your day normally unfolds.",
    vocabulary: ["daily routine", "usually", "wind down"],
  },
  "family-friends": {
    context: "Practice talking about relationships, shared experiences, and people who matter to you.",
    vocabulary: ["get along", "supportive", "have in common"],
  },
  "food-cooking": {
    context: "Practice discussing meals, cooking preferences, and everyday food experiences.",
    vocabulary: ["ingredients", "homemade", "seasoning"],
  },
  shopping: {
    context: "Practice describing purchases, preferences, and common conversations in shops.",
    vocabulary: ["good value", "compare prices", "return policy"],
  },
  travel: {
    context: "Practice handling travel plans, journeys, and common situations away from home.",
    vocabulary: ["itinerary", "accommodation", "get around"],
  },
  transportation: {
    context: "Practice talking about journeys, transport choices, and getting from place to place.",
    vocabulary: ["commute", "public transport", "traffic congestion"],
  },
  work: {
    context: "Practice discussing responsibilities, workplace situations, and professional goals.",
    vocabulary: ["deadline", "workload", "collaborate"],
  },
  study: {
    context: "Practice explaining learning habits, subjects, and experiences in education.",
    vocabulary: ["assignment", "revise", "make progress"],
  },
  hobbies: {
    context: "Practice sharing interests, free-time activities, and what makes them enjoyable.",
    vocabulary: ["take up", "spare time", "rewarding"],
  },
  "movies-music": {
    context: "Practice expressing opinions about entertainment, performers, and memorable works.",
    vocabulary: ["soundtrack", "performance", "thought-provoking"],
  },
  "health-fitness": {
    context: "Practice discussing healthy routines, exercise, and everyday wellbeing.",
    vocabulary: ["balanced diet", "work out", "wellbeing"],
  },
  technology: {
    context: "Practice explaining how technology affects your routines, communication, and choices.",
    vocabulary: ["user-friendly", "device", "stay connected"],
  },
  "home-neighborhood": {
    context: "Practice describing where you live, local places, and life in your neighborhood.",
    vocabulary: ["residential area", "nearby", "local amenities"],
  },
  "social-situations": {
    context: "Practice responding naturally in introductions, invitations, and everyday social moments.",
    vocabulary: ["make small talk", "catch up", "feel at ease"],
  },
  "future-plans": {
    context: "Practice explaining intentions, hopes, and decisions about the future.",
    vocabulary: ["look forward to", "long-term goal", "intend to"],
  },
};

export function getTopicPresentation(slug: string, name: string): TopicPresentation {
  return presentations[slug] ?? {
    context: `Practice expressing your ideas naturally in a conversation about ${name}.`,
    vocabulary: [],
  };
}
