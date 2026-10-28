import { redirect } from "next/navigation";
import { parseSpeakingTab, SpeakingHub } from "../../../../components/speaking-hub/speaking-hub";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { learnerLevels, type LearnerLevel } from "../../../../modules/profile/types";
import { getAvailableTopics } from "../../../../modules/topics/repository";

type SearchParams = { tab?: string | string[]; search?: string | string[]; level?: string | string[] };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const dynamic = "force-dynamic";

/**
 * Speaking hub. `/explore` redirects here with `?tab=topics` (search and level
 * carried over); role-play sessions keep `/speaking/conversation?session=…`.
 */
export default async function SpeakingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/speaking");
  const params = await searchParams;
  const tab = parseSpeakingTab(params.tab);
  const search = first(params.search).trim();
  const requestedLevel = first(params.level).toUpperCase();
  const level = learnerLevels.includes(requestedLevel as LearnerLevel) ? requestedLevel as LearnerLevel : undefined;
  const topics = tab === "topics" ? await getAvailableTopics(user.id, { search: search || undefined, level }) : [];

  return (
    <SpeakingHub
      invalidLevel={Boolean(requestedLevel) && !level}
      level={level}
      search={search}
      tab={tab}
      topics={topics}
    />
  );
}
