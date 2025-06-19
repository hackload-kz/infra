import { auth } from "./src/auth";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // Admin routes - require admin role
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/login', req.url));
        }
        if (req.auth?.user?.role !== 'admin') {
            return Response.redirect(new URL('/profile', req.url));
        }
        return;
    }

    // Profile route - require authentication
    if (pathname.startsWith('/profile')) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/login', req.url));
        }
        return;
    }

    // Redirect authenticated users away from auth pages
    if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
        return Response.redirect(new URL('/profile', req.url));
    }
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
