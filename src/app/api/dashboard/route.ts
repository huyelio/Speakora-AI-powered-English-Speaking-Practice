import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { getDashboard } from "../../../modules/dashboard/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDashboard(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load your dashboard." }, { status: 500 });
  }
}

