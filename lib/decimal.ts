import { Prisma } from "@prisma/client";

/**
 * Утилиты для работы с Decimal из Prisma.
 *
 * Все денежные значения и проценты в БД — Decimal. Здесь — безопасная
 * сериализация в JSON (Server Component → Client Component) и преобразование
 * пользовательского ввода обратно в Decimal.
 */

const { Decimal } = Prisma;

export type DecimalLike = Prisma.Decimal | number | string;

export function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  return new Decimal(value);
}

export function decimalToString(value: Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toString();
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
}

/**
 * Безопасное умножение двух значений и возврат Decimal.
 */
export function multiplyDecimals(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  return new Decimal(a).times(new Decimal(b));
}

/**
 * Сериализация заказов и других сущностей с Decimal-полями для передачи в
 * Client Component. Заменяет все Decimal на string.
 */
export function serializeDecimals<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v && typeof v === "object" && "d" in v && "e" in v && "s" in v) {
        // Prisma Decimal сериализуется так
        return v.toString();
      }
      return v;
    }),
  );
}
