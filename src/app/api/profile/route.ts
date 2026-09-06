import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getProfile, upsertOnboarding } from "../../../modules/profile/repository";
import { parseProfileInput, ProfileInputError } from "../../../modules/profile/validation";

function unauthorized() {
  return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 });
}

export async function GET() {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json({ profile: await getProfile(user.id) });
  } catch {
    return NextResponse.json({ error: "Không thể tải hồ sơ." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin hồ sơ không hợp lệ." }, { status: 400 });
  }

  let input;
  try {
    input = parseProfileInput(payload);
  } catch (error) {
    if (error instanceof ProfileInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Thông tin hồ sơ không hợp lệ." }, { status: 400 });
  }

  try {
    await upsertOnboarding(user.id, input);
    return NextResponse.json({ profile: await getProfile(user.id) });
  } catch {
    return NextResponse.json({ error: "Không thể lưu hồ sơ." }, { status: 500 });
  }
}
