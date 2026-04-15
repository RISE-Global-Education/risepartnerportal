import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Forward pathname to server components via header
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // Match /{secret} and /{secret}/...
  const match = pathname.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const secret = match[1];
  const rest = match[2] ?? "";

  const isCeo = secret === process.env.DASHBOARD_SECRET;
  const isUser = secret === process.env.USER_SECRET;

  // Ignore non-secret segments (api, partner, _next, favicon, etc.)
  if (!isCeo && !isUser) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // CEO secret requires password login
  if (isCeo) {
    if (rest === "/login") {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const authed = req.cookies.get("ceo_auth")?.value === "1";
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = `/${secret}/login`;
      return NextResponse.redirect(url);
    }

    // Redirect bare /{secret} to /{secret}/dashboard
    if (rest === "" || rest === "/") {
      const url = req.nextUrl.clone();
      url.pathname = `/${secret}/dashboard`;
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // User secret requires team login
  if (isUser) {
    if (rest === "/login") {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const authed = !!req.cookies.get("team_auth")?.value;
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = `/${secret}/login`;
      return NextResponse.redirect(url);
    }

    // Restrict to student-pipeline only
    if (!rest.startsWith("/student-pipeline")) {
      const url = req.nextUrl.clone();
      url.pathname = `/${secret}/student-pipeline`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
