/**
 * Системные константы и справочники.
 *
 * Эти значения подобраны так, чтобы их можно было расширять без миграций БД
 * (статусы заказов хранятся как строки, валюты — тоже строки).
 */

export const CURRENCIES = [
  { code: "RUB", name: "Российский рубль", symbol: "₽" },
  { code: "USD", name: "Доллар США", symbol: "$" },
  { code: "EUR", name: "Евро", symbol: "€" },
  { code: "CNY", name: "Китайский юань", symbol: "¥" },
  { code: "KGS", name: "Киргизский сом", symbol: "сом" },
] as const;

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SEWING: "Швейные изделия",
  KNITWEAR: "Трикотаж",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  CONFIRMED: "Подтверждён",
  IN_PRODUCTION: "В производстве",
  READY_TO_SHIP: "Готов к отгрузке",
  SHIPPED: "Отгружен",
  DELIVERED: "Доставлен",
  CLOSED: "Закрыт",
  CANCELLED: "Отменён",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS);

export const ORDER_STATUS_VARIANTS: Record<string, "muted" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "muted",
  CONFIRMED: "info",
  IN_PRODUCTION: "warning",
  READY_TO_SHIP: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CLOSED: "success",
  CANCELLED: "destructive",
};

export const ORDER_HISTORY_CHANGE_TYPES: Record<string, string> = {
  CREATED: "Заказ создан",
  STATUS_CHANGE: "Изменение статуса",
  FIELD_CHANGE: "Изменение поля",
  ITEM_ADDED: "Добавлена позиция",
  ITEM_REMOVED: "Удалена позиция",
  ITEM_UPDATED: "Изменена позиция",
  CASHBACK_CHANGE: "Изменение кэшбэка",
  DOCUMENT_ADDED: "Добавлен документ",
  DOCUMENT_REGENERATED: "Документ перегенерирован",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  contract: "Договоры",
  specification: "Спецификации",
  shipping: "Отгрузочные",
  label: "Вшивные бирки",
  other: "Прочее",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активный",
  VOIDED: "Аннулирован",
  ARCHIVED: "В архиве",
};

export const COUNTRY_OF_ORIGIN = "Кыргызстан";

/**
 * Базовые символы по уходу за изделием.
 * Используются в этикетках. Будут отрендерены в PDF.
 */
export const CARE_INSTRUCTIONS = {
  delicateWash30: "Деликатная стирка при 30°C",
  noTumbleDry: "Не подвергать машинной сушке",
  gentleIron: "Деликатная глажка",
  noBleach: "Не отбеливать",
} as const;
