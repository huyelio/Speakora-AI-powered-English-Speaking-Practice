import { ConversationSessionView } from "../../../../components/conversation/conversation-session";
import { SpeakingTabs } from "../../../../components/conversation/speaking-tabs";
import { findConversationScenario } from "../../../../modules/conversation/scenario";
import { notFound, redirect } from "next/navigation";

export default async function ConversationPage({ searchParams }: { searchParams: Promise<{ session?: string | string[]; scenario?: string | string[] }> }) {
  const params = await searchParams;
  const candidate = typeof params.session === "string" ? params.session : null;
  const sessionId = candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
  const scenarioKey = typeof params.scenario === "string" ? params.scenario : undefined;
  const scenario = !sessionId && scenarioKey ? findConversationScenario(scenarioKey) : undefined;
  if (!sessionId && scenarioKey && !scenario) notFound();
  // The scenario catalog now lives in the speaking hub; session URLs are unchanged.
  if (!sessionId && !scenario) redirect("/speaking?tab=roleplay");
  return <div><SpeakingTabs active="roleplay" />
    <ConversationSessionView key={sessionId ?? scenario!.key} initialSessionId={sessionId} initialScenario={scenario} />
  </div>;
}
