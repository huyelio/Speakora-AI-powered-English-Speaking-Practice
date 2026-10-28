import { redirect } from "next/navigation";
import { legacyHubRedirect } from "../../../components/vocabulary-hub/hub-model";
import { VocabularyHub } from "../../../components/vocabulary-hub/vocabulary-hub";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getProfile } from "../../../modules/profile/repository";
import { getLearningResumeSummary, listVocabularyTopicProgress } from "../../../modules/vocabulary-learning/repository";

export const dynamic = "force-dynamic";

type SearchParams = { mode?: string | string[]; topic?: string | string[] };

/** Vocabulary hub. Old `?mode=` and `?topic=` links (and `/vocabulary-learning`, `/pronunciation`) land on topic pages. */
export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/vocabulary");
  const legacy = legacyHubRedirect(await searchParams);
  if (legacy) redirect(legacy);

  const profile = await getProfile(user.id);
  const [topics, resume] = await Promise.all([
    listVocabularyTopicProgress(user.id, profile?.level ?? null),
    getLearningResumeSummary(user.id).catch(() => null),
  ]);
  // Cards never show the word list, so keep it out of the client payload.
  const cards = topics.map(({ words, ...card }) => { void words; return card; });
  return <VocabularyHub resume={resume} topics={cards} />;
}
