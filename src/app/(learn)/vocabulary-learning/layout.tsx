import type { ReactNode } from "react";
import "./vocabulary-learning.css";
export default function VocabularyLearningLayout({ children }: { children: ReactNode }) {
  return <div className="vocabulary-learning pron-page">{children}</div>;
}
