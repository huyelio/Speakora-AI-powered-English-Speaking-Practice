import { redirect } from "next/navigation";
import { SpeakingHub } from "../../../../components/speaking-hub/speaking-hub";
import { getRequestUser } from "../../../../lib/supabase/auth-server";
import { learnerLevels, type LearnerLevel } from "../../../../modules/profile/types";
import { getAvailableTopics } from "../../../../modules/topics/repository";

type SearchParams = { tab?: string | string[]; search?: string | string[]; level?: string | string[] };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const dynamic = "force-dynamic";

/**
 * Speaking hub (topics only). `/explore` redirects here with `?tab=topics` (search and level
 * carried over); the old `?tab=roleplay` link moved to its own section, /conversation.
 */
export default async function SpeakingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/speaking");
  const params = await searchParams;
  if (first(params.tab) === "roleplay") redirect("/conversation");
  const search = first(params.search).trim();
  const requestedLevel = first(params.level).toUpperCase();
  const level = learnerLevels.includes(requestedLevel as LearnerLevel) ? requestedLevel as LearnerLevel : undefined;
  const topics = await getAvailableTopics(user.id, { search: search || undefined, level });

  return (
    <SpeakingHub
      invalidLevel={Boolean(requestedLevel) && !level}
      level={level}
      search={search}
      topics={topics}
    />
  );
}
