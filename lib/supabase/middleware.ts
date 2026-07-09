import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const REFRESH_THRESHOLD_SECONDS = 5 * 60;
const PUBLIC_PATHS = new Set(["/", "/login", "/auth/callback"]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return supabaseResponse;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return supabaseResponse;
  }

  const secondsUntilExpiry = session.expires_at
    ? session.expires_at - Math.floor(Date.now() / 1000)
    : 0;

  if (secondsUntilExpiry <= REFRESH_THRESHOLD_SECONDS) {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}
