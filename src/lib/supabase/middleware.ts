import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks when env is not configured yet
  if (!url || !key || url.includes("placeholder") || url.includes("your-project")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAuthPage =
    path.startsWith("/login") || path.startsWith("/signup") || path === "/auth";
  const isProtected =
    path.startsWith("/restaurant") ||
    path.startsWith("/driver") ||
    path.startsWith("/admin") ||
    path.startsWith("/checkout") ||
    path.startsWith("/orders");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const redirectUrl = request.nextUrl.clone();
    switch (profile?.role) {
      case "restaurant":
        redirectUrl.pathname = "/restaurant";
        break;
      case "driver":
        redirectUrl.pathname = "/driver";
        break;
      case "admin":
        redirectUrl.pathname = "/admin";
        break;
      default:
        redirectUrl.pathname = "/";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
