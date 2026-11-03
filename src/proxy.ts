import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { publicCollectionStatus } from "@/lib/public-routing";

export async function proxy(request: NextRequest) {
  const publicStatus = publicCollectionStatus(request.nextUrl.pathname);
  if (publicStatus === "known") return NextResponse.next();
  if (publicStatus === "missing") {
    // Resolve unknown collection URLs to the unmatched-route 404 before a
    // dynamic collection shell can stream. Keep the shared root chrome and
    // original browser URL; never classify private routes here.
    const missing = request.nextUrl.clone();
    missing.pathname = "/__missing-public-page";
    missing.search = "";
    return NextResponse.rewrite(missing, { status: 404, headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    } });
  }
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  if (config) {
    const client = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    try {
      await client.auth.getClaims();
    } catch {
      /* Endpoints independently verify identity. */
    }
  }
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/login", "/book", "/account/:path*", "/admin/:path*", "/api/:path*", "/destinations/:path*", "/guides/:path*"],
};
