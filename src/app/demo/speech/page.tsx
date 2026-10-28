import { redirect } from "next/navigation";
import { PracticeSession } from "../../../components/practice/practice-session";
import { getRequestUser } from "../../../lib/supabase/auth-server";

/** Guest IELTS demo. Signed-in learners use /ielts inside the app shell. */
export default async function SpeechDemoPage() {
  const user = await getRequestUser();
  if (user) redirect("/ielts");
  return <PracticeSession initialSession={null} principalKind="guest" />;
}
