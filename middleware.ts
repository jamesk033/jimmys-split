import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "./lib/guest";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot", "/auth", "/manifest.webmanifest", "/sw.js", "/offline", "/favicon.png", "/privacy", "/welcome", "/faq", "/guest", "/robots.txt"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (process.env.PREVIEW_MODE === "1" && request.nextUrl.pathname.startsWith("/preview/")) return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  const guest = !user && request.cookies.get(GUEST_COOKIE)?.value === "1";
  if (!user && !isPublic && !(guest && !path.startsWith("/api/") && path !== "/mfa")) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const redirect = request.nextUrl.clone();
    // The home address shows the front page; anything else asks to sign in.
    redirect.pathname = path === "/" ? "/welcome" : "/login";
    redirect.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(redirect);
  }
  // Two-factor: signed in with a password but the authenticator code is still owed.
  if (user && !isPublic && path !== "/mfa") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      if (path.startsWith("/api/")) return NextResponse.json({ error: "Two-factor code required" }, { status: 401 });
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/mfa";
      redirect.search = `?next=${encodeURIComponent(path)}`;
      return NextResponse.redirect(redirect);
    }
  }
  if (user && (path === "/login" || path === "/signup" || path === "/forgot" || path === "/welcome")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
