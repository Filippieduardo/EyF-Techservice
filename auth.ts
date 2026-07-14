import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "staff-login",
      name: "Staff",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.activo) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.role,
          type: "staff",
        };
      },
    }),
    CredentialsProvider({
      id: "cliente-login",
      name: "Cliente",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const cliente = await prisma.cliente.findUnique({
          where: { email: credentials.email as string },
        });
        if (!cliente || !cliente.portalPassword) return null;
        const valid = await bcrypt.compare(credentials.password as string, cliente.portalPassword);
        if (!valid) return null;
        return {
          id: cliente.id,
          email: cliente.email ?? "",
          name: cliente.nombre,
          role: "CLIENTE",
          type: "cliente",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.type = (user as any).type;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).type = token.type;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
});
