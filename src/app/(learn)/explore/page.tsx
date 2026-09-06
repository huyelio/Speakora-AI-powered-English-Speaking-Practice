import { redirect } from "next/navigation";
import { TopicGrid } from "../../../components/topics/topic-grid";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { learnerLevels, type LearnerLevel } from "../../../modules/profile/types";
import { getAvailableTopics } from "../../../modules/topics/repository";

type SearchParams = { search?: string | string[]; level?: string | string[] };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/explore");
  const params = await searchParams;
  const search = first(params.search).trim();
  const requestedLevel = first(params.level).toUpperCase();
  const level = learnerLevels.includes(requestedLevel as LearnerLevel) ? requestedLevel as LearnerLevel : undefined;
  const topics = await getAvailableTopics(user.id, { search: search || undefined, level });

  return (
    <div className="explore-page">
      <header className="page-heading">
        <p className="eyebrow">GENERAL ENGLISH</p>
        <h1>Explore speaking topics</h1>
        <p>Choose reviewed questions that match the situation and level you want to practise.</p>
      </header>
      <form className="explore-filters">
        <label htmlFor="topic-search">Search topics</label>
        <input defaultValue={search} id="topic-search" name="search" placeholder="Travel, work, food…" type="search" />
        <label htmlFor="topic-level">Level</label>
        <select defaultValue={level ?? ""} id="topic-level" name="level">
          <option value="">All levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <button className="primary" type="submit">Apply filters</button>
      </form>
      {requestedLevel && !level ? <p className="error" role="alert">Choose Beginner, Intermediate, or Advanced.</p> : null}
      <TopicGrid topics={topics} />
    </div>
  );
}

