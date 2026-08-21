import type { NextRequest } from "next/server";
import { updateAuthSession } from "./src/lib/supabase/auth-middleware";

export async function middleware(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/explore/:path*",
    "/topics/:path*",
    "/practice/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
  ],
};
