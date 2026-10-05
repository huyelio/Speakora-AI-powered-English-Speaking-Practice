import { ConversationSessionView } from "../../../../components/conversation/conversation-session";

export default async function ConversationPage({ searchParams }: { searchParams: Promise<{ session?: string | string[] }> }) {
  const params = await searchParams;
  const candidate = typeof params.session === "string" ? params.session : null;
  const sessionId = candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
  return <ConversationSessionView initialSessionId={sessionId} />;
}
