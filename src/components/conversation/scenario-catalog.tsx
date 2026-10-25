import React from "react";
import Link from "next/link";
import { conversationScenarios } from "../../modules/conversation/scenario";
import styles from "./conversation.module.css";

export function ScenarioCatalog() {
  return <section aria-labelledby="roleplay-heading">
    <header className="page-heading">
      <p className="eyebrow">AI ROLE-PLAY · THỬ NGHIỆM</p>
      <h1 id="roleplay-heading">Bạn muốn trò chuyện trong tình huống nào?</h1>
      <p>Chọn một vai, bước vào câu chuyện và luyện nói theo cách của bạn.</p>
    </header>
    <div className={styles.catalog}>
      {conversationScenarios.map(scenario => <Link className={styles.scenarioCard} href={`/speaking/conversation?scenario=${scenario.key}`} key={scenario.key}>
        <span className={styles.cardMeta}>{scenario.category} · {scenario.difficulty === "BEGINNER" ? "Cơ bản" : "Trung cấp"}</span>
        <h2>{scenario.title}</h2>
        <p lang="en">{scenario.description}</p>
        <span className={styles.cardMeta}>{scenario.duration} <span aria-hidden="true">→</span></span>
      </Link>)}
    </div>
  </section>;
}
