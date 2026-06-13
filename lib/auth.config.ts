import type { NextAuthConfig } from "next-auth";

/**
 * Edge-совместимая часть конфигурации Auth.js.
 *
 * Используется в `middleware.ts`, поэтому не должна импортировать модули,
 * требующие Node.js runtime (bcrypt, Prisma и т.п.). Полная конфигурация
 * с провайдером Credentials живёт в `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnDashboard = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/dashboard");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (isOnDashboard) {
        return isLoggedIn;
      }

      // Все остальные защищённые маршруты — нужен вход.
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.fullName = user.fullName;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  },
  providers: [],
} satisfies NextAuthConfig;
