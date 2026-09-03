import { PracticeSession } from "../../../components/practice/practice-session";

export default function SpeechDemoPage() {
  return (
    <main className="practice-shell">
      <PracticeSession initialSession={null} principalKind="guest" />
    </main>
  );
}
