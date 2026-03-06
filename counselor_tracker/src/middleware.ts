import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to dashboard routes
  const match = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const secret = match[1];
  const rest = match[2] ?? "";

  const isUser = secret === process.env.USER_SECRET;

  // User role can only access /student-pipeline routes
  if (isUser && !rest.startsWith("/student-pipeline")) {
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${secret}/student-pipeline`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:secret*",
};
