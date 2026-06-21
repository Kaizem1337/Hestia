import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getEnv } from "@/lib/env";

/**
 * NextAuth (Auth.js) configuration.
 *
 * - Credentials provider with bcrypt password verification.
 * - JWT session strategy (required for credentials), signed with NEXTAUTH_SECRET.
 * - The user id is threaded into the JWT and session for per-user scoping.
 *
 * Cookie security is intentionally left to NextAuth's default, which derives
 * `Secure` / `__Secure-` from the NEXTAUTH_URL scheme (https -> secure). This
 * keeps the auth route and the middleware in agreement on the cookie name, and
 * lets the app work over plain HTTP (e.g. http://<host-ip>:9637) where a forced
 * Secure cookie would be rejected by the browser. Set NEXTAUTH_URL to the exact
 * URL you serve the app on (http or https) for sign-in to work.
 */
export const authOptions: NextAuthOptions = {
  secret: getEnv().NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
