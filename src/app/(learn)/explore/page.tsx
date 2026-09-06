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
        <h1>Khám phá chủ đề Speaking</h1>
        <p>Chọn câu hỏi phù hợp với tình huống và trình độ bạn muốn luyện.</p>
      </header>
      <form className="explore-filters">
        <label htmlFor="topic-search">Tìm chủ đề</label>
        <input defaultValue={search} id="topic-search" name="search" placeholder="Travel, work, food…" type="search" />
        <label htmlFor="topic-level">Trình độ</label>
        <select defaultValue={level ?? ""} id="topic-level" name="level">
          <option value="">Tất cả trình độ</option>
          <option value="BEGINNER">Cơ bản</option>
          <option value="INTERMEDIATE">Trung cấp</option>
          <option value="ADVANCED">Nâng cao</option>
        </select>
        <button className="primary" type="submit">Lọc chủ đề</button>
      </form>
      {requestedLevel && !level ? <p className="error" role="alert">Hãy chọn trình độ Cơ bản, Trung cấp hoặc Nâng cao.</p> : null}
      <TopicGrid topics={topics} />
    </div>
  );
}

