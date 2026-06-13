/**
 * Каталог переменных, доступных в Word-шаблонах.
 *
 * Шаблоны используют синтаксис docxtemplater: `{client.companyName}`.
 * Для повторяющихся блоков (например, позиции заказа) синтаксис цикла:
 *   `{#items}` ... содержимое строки таблицы ... `{/items}`
 *
 * Этот файл — единый источник истины: при генерации мы собираем контекст
 * именно с этими ключами, и эта же документация рендерится на странице
 * «Доступные переменные».
 */

export type VariableDoc = {
  path: string;         // например, "client.companyName"
  description: string;  // что это
  example?: string;     // пример значения
};

export type VariableSection = {
  title: string;
  description?: string;
  variables: VariableDoc[];
};

export const VARIABLE_SECTIONS: VariableSection[] = [
  {
    title: "Клиент (покупатель / импортёр)",
    description: "Используется в договорах, спецификациях, инвойсах",
    variables: [
      { path: "client.companyName", description: "Наименование компании", example: 'ООО "Ромашка"' },
      { path: "client.inn", description: "ИНН клиента", example: "7707083893" },
      { path: "client.ogrnip", description: "ОГРН / ОГРНИП" },
      { path: "client.legalAddress", description: "Юридический адрес" },
      { path: "client.email", description: "Email клиента" },
      { path: "client.phone", description: "Телефон клиента" },
      { path: "client.bank.bankName", description: "Наименование банка (первый счёт)" },
      { path: "client.bank.bic", description: "БИК (первый счёт)" },
      { path: "client.bank.accountNumber", description: "Расчётный счёт (первый счёт)" },
      { path: "client.bank.correspondentAccount", description: "Корр. счёт (первый счёт)" },
    ],
  },
  {
    title: "Фабрика (поставщик)",
    variables: [
      { path: "factory.name", description: "Название фабрики" },
      { path: "factory.contractCurrency", description: "Валюта контракта", example: "USD" },
      { path: "factory.inn", description: "ИНН фабрики" },
      { path: "factory.legalAddress", description: "Юридический адрес" },
      { path: "factory.actualAddress", description: "Фактический адрес" },
      { path: "factory.email", description: "Email фабрики" },
      { path: "factory.phone", description: "Телефон фабрики" },
      { path: "factory.paymentTerms", description: "Условия оплаты" },
      { path: "factory.bank.bankName", description: "Наименование банка (первый счёт)" },
      { path: "factory.bank.bic", description: "БИК" },
      { path: "factory.bank.accountNumber", description: "Расчётный счёт" },
      { path: "factory.bank.correspondentAccount", description: "Корр. счёт" },
      { path: "factory.bank.correspondentBank", description: "Банк-корреспондент" },
    ],
  },
  {
    title: "Заказ",
    description: "Доступно при генерации документа из карточки заказа",
    variables: [
      { path: "order.orderNumber", description: "Номер заказа", example: "ORD-2026-00001" },
      { path: "order.orderDate", description: "Дата заказа", example: "12.06.2026" },
      { path: "order.name", description: "Название заказа" },
      { path: "order.status", description: "Текущий статус (русское название)" },
      { path: "order.totalSomAmount", description: "Итого в сом", example: "1 250 000,00" },
      { path: "order.totalRubAmount", description: "Итого в рублях", example: "987 654,32" },
      { path: "order.cashbackPercent", description: "Кэшбэк, %" },
      { path: "order.cashbackAmount", description: "Кэшбэк, сумма" },
      { path: "order.cashbackCurrency", description: "Валюта кэшбэка" },
      { path: "order.comments", description: "Комментарий к заказу" },
      { path: "order.itemsCount", description: "Количество позиций" },
    ],
  },
  {
    title: "Товар",
    description: "Используется в этикетках и спецификациях по одной позиции",
    variables: [
      { path: "product.name", description: "Наименование товара" },
      { path: "product.sku", description: "Артикул" },
      { path: "product.type", description: "Тип (швейка / трикотаж)" },
      { path: "product.composition", description: "Состав", example: "95% хлопок, 5% эластан" },
      { path: "product.color", description: "Основной цвет" },
      { path: "product.hsCode", description: "Код ТН ВЭД" },
    ],
  },
  {
    title: "Позиции заказа (цикл)",
    description:
      "Для построчного перечисления позиций оберните разметку в `{#items}` ... `{/items}` " +
      "и внутри используйте поля без префикса.",
    variables: [
      { path: "items[*].sku", description: "Артикул позиции" },
      { path: "items[*].name", description: "Наименование товара" },
      { path: "items[*].sizeCode", description: "Размер" },
      { path: "items[*].color", description: "Цвет" },
      { path: "items[*].quantity", description: "Количество" },
      { path: "items[*].priceSom", description: "Цена за единицу, сом" },
      { path: "items[*].priceRub", description: "Цена за единицу, руб" },
      { path: "items[*].subtotalSom", description: "Сумма, сом" },
      { path: "items[*].subtotalRub", description: "Сумма, руб" },
    ],
  },
  {
    title: "Сегодняшняя дата и пользователь",
    variables: [
      { path: "today", description: "Сегодняшняя дата", example: "12.06.2026" },
      { path: "today.iso", description: "Сегодняшняя дата в ISO", example: "2026-06-12" },
      { path: "today.month", description: "Месяц + год прописью", example: "Июнь 2026" },
      { path: "user.fullName", description: "Имя пользователя, генерирующего документ" },
    ],
  },
];

/**
 * Плоский список всех ключей — для подсказок и валидации шаблона.
 */
export const VARIABLE_PATHS: string[] = VARIABLE_SECTIONS.flatMap((s) =>
  s.variables.map((v) => v.path),
);
