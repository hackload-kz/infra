import { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { isOrganizer } from "@/lib/admin";
import { logger, LogAction } from "@/lib/logger";
import "@/types/auth";

export default {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      checks: ["pkce", "state"],
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      checks: ["pkce", "state"],
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (user.email) {
        await logger.info(LogAction.LOGIN, 'User', `User signed in: ${user.email} via ${account?.provider}`, { 
          userEmail: user.email, 
          metadata: { provider: account?.provider, timestamp: new Date().toISOString() }
        });
      }
    },
    async signOut() {
      // Note: SignOut event logging temporarily disabled due to type issues
      // The signOut event parameter structure varies in NextAuth v5
      await logger.info(LogAction.LOGIN, 'User', 'User signed out', { 
        metadata: { timestamp: new Date().toISOString() }
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user exists in database
      if ((account?.provider === "google" || account?.provider === "github") && user.email) {
        try {
          let dbUser = await db.user.findUnique({
            where: { email: user.email },
            include: { participant: true },
          });

          if (!dbUser) {
            // Create user for OAuth sign-in
            dbUser = await db.user.create({
              data: {
                email: user.email,
                // No password field for OAuth users
              },
              include: { participant: true },
            });
            await logger.info(LogAction.LOGIN, 'User', `New user registered via OAuth: ${user.email} using ${account?.provider}`, { userEmail: user.email, metadata: { provider: account?.provider } });
          } else {
            await logger.info(LogAction.LOGIN, 'User', `User authenticated: ${user.email} using ${account?.provider}`, { userEmail: user.email, metadata: { provider: account?.provider } });
          }
        } catch (error) {
          await logger.error(LogAction.LOGIN, 'User', `Error creating OAuth user: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: user.email, metadata: { error: error instanceof Error ? error.stack : error } });
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && user.email) {
        // Determine role based on email
        token.role = isOrganizer(user.email) ? "admin" : "participant";
        token.sub = user.id;
        
        // Add session metadata for security
        if (account) {
          token.provider = account.provider;
          token.iat = Math.floor(Date.now() / 1000);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnProfile = nextUrl.pathname.startsWith("/profile");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      // Admin routes require admin role
      if (isOnAdmin) {
        if (isLoggedIn && auth?.user?.role === "admin") return true;
        return false;
      }

      // Dashboard and profile require authentication
      if (isOnDashboard || isOnProfile) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      // Already logged in users trying to access login/register
      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return Response.redirect(new URL("/space/", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
