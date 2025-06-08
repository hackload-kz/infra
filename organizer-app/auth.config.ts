import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export default {
    providers: [
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

                // Get admin users from environment
                const adminUsers = process.env.ADMIN_USERS?.split(",") || [];

                for (const userStr of adminUsers) {
                    const [email, password] = userStr.split(":");
                    if (email === credentials.email && password === credentials.password) {
                        return {
                            id: email,
                            email: email,
                            name: email.split("@")[0],
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }
            return true;
        },
    },
    pages: {
        signIn: "/login",
    },
    trustHost: true,
} satisfies NextAuthConfig;
