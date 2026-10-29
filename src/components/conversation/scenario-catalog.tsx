"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Coffee, Filter, Plane, Search, Users, type LucideIcon } from "lucide-react";
import { scenarioCards } from "../../modules/conversation/catalog";
import { scenarioCategoryLabels, type ConversationScenario } from "../../modules/conversation/scenario";
import styles from "./conversation.module.css";

const categoryIcons: Record<ConversationScenario["category"], LucideIcon> = {
  Travel: Plane, Everyday: Coffee, Work: Briefcase, Social: Users,
};
const difficultyLabels: Record<ConversationScenario["difficulty"], string> = {
  BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

/** Scenario picker for /conversation. The list is static, so search and level filter run in the browser. */
export function ScenarioCatalog() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"" | ConversationScenario["difficulty"]>("");
  const needle = normalize(query.trim());
  const cards = scenarioCards.filter((card) =>
    (!difficulty || card.difficulty === difficulty)
    && (!needle || normalize(`${card.title} ${card.englishTitle} ${card.summary} ${scenarioCategoryLabels[card.category]}`).includes(needle)));

  return (
    <section aria-labelledby="roleplay-heading" className={styles.catalogSection}>
      <div className={styles.catalogHead}>
        <div>
          <h2 id="roleplay-heading">Tất cả tình huống</h2>
          <p>Từ những tình huống quen thuộc đến các thử thách giao tiếp khó hơn.</p>
        </div>
        <div className={styles.catalogFilters} role="search">
          <label className={styles.filterField}>
            <Search aria-hidden="true" size={17} />
            <input aria-label="Tìm tình huống" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tình huống…" type="search" value={query} />
          </label>
          <label className={styles.filterField}>
            <Filter aria-hidden="true" size={17} />
            <select aria-label="Trình độ" onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}>
              <option value="">Tất cả trình độ</option>
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
            </select>
          </label>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className={styles.catalogEmpty} role="status">Không tìm thấy tình huống phù hợp. Hãy thử từ khóa hoặc trình độ khác.</p>
      ) : (
        <ul className={styles.catalog}>
          {cards.map((card) => {
            const Icon = categoryIcons[card.category];
            return (
              <li key={card.key}>
                <Link className={styles.scenarioCard} data-level={card.difficulty} data-tone={card.category} href={`/conversation/session?scenario=${card.key}`}>
                  <span className={styles.cardArt}>
                    <Image alt="" height={512} src={card.image} unoptimized width={768} />
                    <span className={styles.cardLevel}>{difficultyLabels[card.difficulty]}</span>
                  </span>
                  <div className={styles.cardBody}>
                    <h3>{card.title}</h3>
                    <small lang="en">{card.englishTitle}</small>
                    <p>{card.summary}</p>
                    <span className={styles.cardFoot}>
                      <span><Icon aria-hidden="true" size={16} />{scenarioCategoryLabels[card.category]}</span>
                      <span aria-hidden="true" className={styles.cardGo}><ArrowRight size={17} /></span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
