import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { decodeHistoryCursor, getHistory } from "../../../modules/dashboard/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const cursorValue = new URL(request.url).searchParams.get("cursor");
  let cursor;
  try {
    cursor = cursorValue ? decodeHistoryCursor(cursorValue) : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid history cursor." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getHistory(user.id, { cursor }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load your practice history." }, { status: 500 });
  }
}
