import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminCredentials } from "@/lib/admin";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check admin users first
        const adminCredentials = getAdminCredentials();
        const adminUser = adminCredentials.find(admin =>
          admin.email === credentials.email && admin.password === credentials.password
        );

        if (adminUser) {
          return {
            id: adminUser.email,
            email: adminUser.email,
            name: adminUser.email.split("@")[0],
            role: "organizer",
          };
        }

        // Check regular users in database
        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (user && user.password) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password as string,
              user.password
            );

            if (isPasswordValid) {
              return {
                id: user.id,
                email: user.email,
                name: user.email.split("@")[0],
                role: "participant",
              };
            }
          }
        } catch (error) {
          console.error("Database error during authentication:", error);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" && user.email) {
        try {
          let dbUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            // Create user for OAuth sign-in
            dbUser = await db.user.create({
              data: {
                email: user.email,
                // No password field for OAuth users
              },
            });
          }
        } catch (error) {
          console.error("Error creating OAuth user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || "participant";
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
        return Response.redirect(new URL("/profile", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
