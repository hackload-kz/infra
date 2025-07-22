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
    async session({ session, token }) {
      return session
    },
    async jwt({ token, user }) {
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