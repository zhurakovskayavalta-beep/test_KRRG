import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Защита маршрутов выполняется в authConfig.callbacks.authorized.
// Здесь подключаем только edge-совместимую конфигурацию (без Prisma/bcrypt).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
