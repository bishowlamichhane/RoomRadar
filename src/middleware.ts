import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role ?? null;

  const isAdminLogin = nextUrl.pathname === "/admin/login";
  const needsAdmin = nextUrl.pathname.startsWith("/admin") && !isAdminLogin;
  const needsAuth =
    ["/dashboard", "/listings/new"].some((p) =>
      nextUrl.pathname.startsWith(p),
    ) || /^\/listings\/[^/]+\/edit/.test(nextUrl.pathname);

  // Admin is signed in and hits the admin login page → send them into the dashboard.
  if (isAdminLogin && role === "ADMIN") {
    return Response.redirect(new URL("/admin", nextUrl));
  }
  if (needsAdmin && role !== "ADMIN") {
    return Response.redirect(new URL("/admin/login", nextUrl));
  }
  if (needsAuth && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/listings/new",
    "/listings/:id/edit",
    "/admin/:path*",
  ],
};
