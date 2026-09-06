import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { learnerLevels, type LearnerLevel } from "../../../modules/profile/types";
import { getAvailableTopics } from "../../../modules/topics/repository";

function unauthorized() {
  return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
}

function readLevel(value: string | null): LearnerLevel | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  return learnerLevels.includes(normalized as LearnerLevel) ? normalized as LearnerLevel : undefined;
}

export async function GET(request: Request) {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const levelValue = searchParams.get("level");
  const level = readLevel(levelValue);
  if (levelValue && !level) {
    return NextResponse.json({ error: "Trình độ không hợp lệ." }, { status: 400 });
  }

  try {
    const topics = await getAvailableTopics(user.id, {
      search: searchParams.get("search")?.trim() || undefined,
      level,
    });
    return NextResponse.json({ topics }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Không thể tải danh sách chủ đề." }, { status: 500 });
  }
}
