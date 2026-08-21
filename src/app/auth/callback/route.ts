import { NextResponse, type NextRequest } from "next/server";
import { createAuthServerClient } from "../../../lib/supabase/auth-server";
import { safeReturnPath } from "../../../modules/auth/redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/auth/sign-in", request.url));
}
