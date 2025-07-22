import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const validUsername = process.env.LOAD_USERNAME
        const validPassword = process.env.LOAD_PASSWORD

        if (credentials.username === validUsername && credentials.password === validPassword) {
          return {
            id: '1',
            name: 'Load Testing User',
            email: 'loadtester@hackload.kz',
          }
        }

        return null
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to the /load path after authentication
      if (url.startsWith('/')) {
        return `${baseUrl}/load${url}`
      }
      // If it's already a full URL and contains our domain, ensure it includes /load
      if (url.includes(baseUrl) && !url.includes('/load')) {
        return url.replace(baseUrl, `${baseUrl}/load`)
      }
      // Default fallback to load app home page
      return `${baseUrl}/load`
    },
    async session({ session }) {
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt'
  }
}