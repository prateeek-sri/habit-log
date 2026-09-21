import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectToDatabase from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password')
        }

        await connectToDatabase()

        const user = await User.findOne({ email: credentials.email })

        if (user) {
          // Check password
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            throw new Error('Invalid password')
          }
          return { id: user._id.toString(), email: user.email, name: user.name }
        } else {
          // Register new user (auto-register on login for simplicity during dev)
          const hashedPassword = await bcrypt.hash(credentials.password, 10)
          const newUser = await User.create({
            email: credentials.email,
            password: hashedPassword,
            name: credentials.email.split('@')[0]
          })
          return { id: newUser._id.toString(), email: newUser.email, name: newUser.name }
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login', // We'll build a custom login page
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
