import { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { isOrganizer } from "@/lib/admin";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
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
          } else {
            // Check if user has a participant profile and if it's active
            if (dbUser.participant && !dbUser.participant.isActive) {
              // Block inactive participants from logging in
              return false;
            }
          }
        } catch (error) {
          console.error("Error creating OAuth user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && user.email) {
        // Determine role based on email
        token.role = isOrganizer(user.email) ? "admin" : "participant";
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
  },
} satisfies NextAuthConfig;
