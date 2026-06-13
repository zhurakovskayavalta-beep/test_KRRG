import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Форматирование данных для русского UI.
 */

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy", { locale: ru });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy HH:mm", { locale: ru });
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ru });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  CNY: "¥",
  KGS: "сом",
};

/**
 * Форматирование денежной суммы. Поддерживает Decimal из Prisma.
 */
export function formatMoney(
  value: number | string | { toString(): string } | null | undefined,
  currency = "RUB",
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(num)) return "—";

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${formatted} ${symbol}`;
}

/**
 * Форматирование числа без валюты.
 */
export function formatNumber(
  value: number | string | { toString(): string } | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ГБ`;
}
