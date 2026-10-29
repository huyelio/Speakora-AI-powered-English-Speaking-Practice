import { ConversationSessionView } from "../../../../components/conversation/conversation-session";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { findConversationScenario } from "../../../../modules/conversation/scenario";
import { getProfile } from "../../../../modules/profile/repository";
import { notFound, redirect } from "next/navigation";

export default async function ConversationSessionPage({ searchParams }: { searchParams: Promise<{ session?: string | string[]; scenario?: string | string[] }> }) {
  const params = await searchParams;
  const candidate = typeof params.session === "string" ? params.session : null;
  const sessionId = candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
  const scenarioKey = typeof params.scenario === "string" ? params.scenario : undefined;
  const scenario = !sessionId && scenarioKey ? findConversationScenario(scenarioKey) : undefined;
  if (!sessionId && scenarioKey && !scenario) notFound();
  // The scenario catalog lives on /conversation; the old /speaking/conversation URLs redirect here.
  if (!sessionId && !scenario) redirect("/conversation");
  // Cached per request: the learner layout already loaded the same user and profile.
  const user = await getRequestUser();
  const profile = user ? await getProfile(user.id) : null;
  // Like other session screens, the frame stands alone without the hub heading.
  return <div>
    <ConversationSessionView key={sessionId ?? scenario!.key} initialSessionId={sessionId} initialScenario={scenario} learnerName={profile?.displayName ?? ""} />
  </div>;
}
