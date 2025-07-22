import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const adminUsers = process.env.ADMIN_USERS?.split(',') || []
      
      if (!user.email || !adminUsers.includes(user.email)) {
        return false
      }
      
      return true
    },
    async session({ session, token }) {
      return session
    },
    async jwt({ token, user, account, profile }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}