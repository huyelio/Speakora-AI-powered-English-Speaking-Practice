import { PracticeSession } from "../../../components/practice/practice-session";
import { getRequestUser } from "../../../lib/supabase/auth-server";

export default async function SpeechDemoPage() {
  const user = await getRequestUser();
  return <PracticeSession initialSession={null} principalKind={user ? "user" : "guest"} />;
}
