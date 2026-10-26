import { PracticeSession } from "../../../components/practice/practice-session";

// Authentication and onboarding are enforced by the (learn) layout. Signed-in IELTS
// sessions persist server-side and reopen from history at /practice/<id>, as before.
export default function IeltsPage() {
  return <PracticeSession initialSession={null} principalKind="user" />;
}
