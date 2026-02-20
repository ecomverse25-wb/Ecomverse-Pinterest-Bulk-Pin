import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isErrorPage = request.nextUrl.pathname === "/setup-error";

    if ((!supabaseUrl || !supabaseAnonKey) && !isErrorPage) {
        console.error("Middleware: Missing Env Vars -> Redirecting to /setup-error");
        return NextResponse.redirect(new URL("/setup-error", request.url));
    }

    // If on error page and vars exist, go home
    if (supabaseUrl && supabaseAnonKey && isErrorPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return response; // Allow error page to load
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        }
    );

    // IMPORTANT: Refresh session - this prevents expired sessions
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // ⚠️ INFINITE LOOP PREVENTION: Check if already on auth pages
    const isAuthPage =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/signup");

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/admin");

    // Redirect unauthenticated users to login
    if (!user && isProtectedRoute && !isAuthPage) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from login/signup
    if (user && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-specific protection
    if (request.nextUrl.pathname.startsWith("/admin")) {
        const envAdminEmails = process.env.ADMIN_EMAILS
            ?.split(",")
            .map((email) => email.trim().toLowerCase()) || [];

        // Fallback list (matches lib/admin.ts) to ensure access even if Env Var fails
        const fallbackAdmins = ['admin@pinverse.com', 'admin@pinverse.io', 'ecomverse25@gmail.com'];

        const adminEmails = [...new Set([...envAdminEmails, ...fallbackAdmins])];

        // Use optional chaining safely or default to empty string
        const userEmail = user?.email?.toLowerCase() || "";

        if (!user || !adminEmails.includes(userEmail)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match only specific page routes that need auth protection.
         * Excludes all internal Next.js routes, API routes, and static assets.
         */
        "/",
        "/login",
        "/signup",
        "/dashboard/:path*",
        "/admin/:path*",
        "/setup-error",
    ],
};
