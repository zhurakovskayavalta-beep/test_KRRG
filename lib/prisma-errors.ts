import { Prisma } from "@prisma/client";

/**
 * Перевод типовых ошибок Prisma в понятные русские сообщения.
 *
 * Используется в Server Actions, чтобы пользователь не видел сырой английский
 * текст вроде «Unique constraint failed on the fields: (`sku`)».
 */

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  sku: "Товар с таким артикулом уже существует",
  email: "Запись с таким email уже существует",
  code: "Запись с таким кодом уже существует",
  orderNumber: "Заказ с таким номером уже существует",
};

export function translatePrismaError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target
        : typeof target === "string"
          ? [target]
          : [];
      for (const f of fields) {
        if (UNIQUE_FIELD_MESSAGES[f]) return UNIQUE_FIELD_MESSAGES[f];
      }
      return "Запись с такими данными уже существует";
    }
    if (error.code === "P2003") {
      return "Невозможно сохранить: связанная запись не найдена";
    }
    if (error.code === "P2025") {
      return "Запись не найдена";
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
