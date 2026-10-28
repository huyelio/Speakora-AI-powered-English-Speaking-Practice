import { notFound, redirect } from "next/navigation";
import { parseTopicSlug, vocabularyTopicHref } from "../../../../../components/vocabulary-hub/hub-model";
import { TopicDetail } from "../../../../../components/vocabulary-hub/topic-detail";
import { getRequestUser } from "../../../../../lib/supabase/auth-server";
import { getProfile } from "../../../../../modules/profile/repository";
import { listVocabularyTopicProgress } from "../../../../../modules/vocabulary-learning/repository";

export const dynamic = "force-dynamic";

export default async function VocabularyTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = parseTopicSlug((await params).slug);
  const user = await getRequestUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(slug ? vocabularyTopicHref(slug) : "/vocabulary")}`);
  if (!slug) notFound();
  const profile = await getProfile(user.id);
  const topic = (await listVocabularyTopicProgress(user.id, profile?.level ?? null)).find(entry => entry.slug === slug);
  if (!topic) notFound();
  return <TopicDetail topic={topic} />;
}
