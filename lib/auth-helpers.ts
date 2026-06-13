import { auth } from "@/lib/auth";

/**
 * Использовать в Server Actions и в Server Components для гарантированного
 * получения сессии. Если пользователь не вошёл — выкинет ошибку (middleware
 * должен был его перехватить ранее, это последний рубеж).
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Требуется авторизация");
  }
  return session;
}

export async function currentUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id;
}
