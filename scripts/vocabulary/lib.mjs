export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) {
    throw new Error("Embedding vectors must be non-empty and the same length.");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function buildSenseEmbedText(sense) {
  return [sense.word, sense.meaning_vi, sense.example_sentence, sense.pos]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" | ");
}

export function buildTopicEmbedText(topic) {
  const keywords = Array.isArray(topic.keywords) ? topic.keywords.join(", ") : "";
  return [topic.name, topic.description, keywords]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" | ");
}

export function rankTopicMatches(senseEmbedding, topics) {
  const ranked = topics
    .map((topic) => ({
      topicId: topic.id,
      slug: topic.slug,
      name: topic.name,
      level: topic.difficulty_level || "INTERMEDIATE",
      score: cosineSimilarity(senseEmbedding, topic.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  const top1 = ranked[0] ?? null;
  const top2 = ranked[1] ?? null;
  return {
    ranked,
    top1,
    top2,
    score: top1?.score ?? 0,
    margin: top1 && top2 ? top1.score - top2.score : top1?.score ?? 0,
  };
}

export function shouldAutoAccept(score, margin, threshold = 0.28, minMargin = 0.04) {
  return score >= threshold && margin >= minMargin;
}

export function isActiveGeneralTopic(topic, generalModeId) {
  return Boolean(
    topic
    && topic.is_active
    && topic.mode_id === generalModeId
  );
}

export function normalizeCandidate(row) {
  const word = String(row.word ?? "").trim().toLowerCase();
  const meaning_vi = String(row.meaning_vi ?? "").trim();
  const example_sentence = String(row.example_sentence ?? "").trim();
  const pronunciation_ipa = row.pronunciation_ipa == null
    ? null
    : String(row.pronunciation_ipa).trim() || null;
  const pos = row.pos == null ? null : String(row.pos).trim() || null;
  const source_sense_id = String(row.source_sense_id ?? "").trim();

  if (!word || !meaning_vi || !example_sentence || !source_sense_id) {
    return null;
  }
  if (/\s{2,}/.test(word) || word.length > 40) return null;

  return {
    source_sense_id,
    word,
    meaning_vi,
    example_sentence,
    pronunciation_ipa,
    pos,
  };
}

export function balanceAccepted(accepted, limit, perTopicCap) {
  const byTopic = new Map();
  for (const item of accepted) {
    const key = item.topic_id;
    const list = byTopic.get(key) ?? [];
    list.push(item);
    byTopic.set(key, list);
  }

  const result = [];
  let added = true;
  while (result.length < limit && added) {
    added = false;
    for (const [, list] of byTopic) {
      if (result.length >= limit) break;
      const topicCount = result.filter((item) => item.topic_id === list[0]?.topic_id).length;
      if (topicCount >= perTopicCap) continue;
      const next = list.shift();
      if (!next) continue;
      result.push(next);
      added = true;
    }
  }
  return result;
}
