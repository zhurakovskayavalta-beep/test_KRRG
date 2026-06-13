import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import {
  COUNTRY_OF_ORIGIN,
  ORDER_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";

/**
 * Сбор контекста (значений переменных) для рендера Word-шаблона.
 *
 * Список и формат всех ключей задокументирован в `variables.ts` и должен
 * совпадать. Если меняем — обновляем обе стороны.
 */

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function fmt(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return "";
  return formatNumber(value);
}

function todayContext() {
  const now = new Date();
  return {
    today: format(now, "dd.MM.yyyy", { locale: ru }),
    "today.iso": now.toISOString().slice(0, 10),
    "today.month": `${MONTHS_RU[now.getMonth()]} ${now.getFullYear()}`,
  };
}

type UserCtx = { fullName?: string } | undefined;

function userContext(user: UserCtx) {
  return {
    "user.fullName": user?.fullName ?? "",
  };
}

/**
 * Контекст с примерами значений — для предпросмотра шаблона.
 */
export function buildSampleContext(user?: UserCtx) {
  return {
    ...todayContext(),
    ...userContext(user),
    client: {
      companyName: 'ООО "Ромашка"',
      inn: "7707083893",
      ogrnip: "1027700132195",
      legalAddress: "127015, г. Москва, ул. Новодмитровская, д. 2",
      email: "info@romashka.example",
      phone: "+7 (495) 000-00-00",
      bank: {
        bankName: "ПАО Сбербанк",
        bic: "044525225",
        accountNumber: "40702810900000000001",
        correspondentAccount: "30101810400000000225",
      },
    },
    factory: {
      name: 'ОсОО "Бишкек-Текстиль"',
      contractCurrency: "USD",
      inn: "01209199610087",
      legalAddress: "Кыргызстан, г. Бишкек, ул. Ибраимова 115",
      actualAddress: "Кыргызстан, г. Бишкек, мкр. Тунгуч, 12",
      email: "info@factory.example",
      phone: "+996 (312) 000-000",
      paymentTerms: "Предоплата 50%, остаток после отгрузки",
      bank: {
        bankName: "ОАО Демир Кыргыз Интернэшнл Банк",
        bic: "104001",
        accountNumber: "1280000000123456",
        correspondentAccount: "1280000099999999",
        correspondentBank: "RAIFFEISEN BANK INTERNATIONAL",
      },
    },
    order: {
      orderNumber: "ORD-2026-00001",
      orderDate: format(new Date(), "dd.MM.yyyy", { locale: ru }),
      name: "Летняя коллекция 2026",
      status: ORDER_STATUS_LABELS.CONFIRMED,
      totalSomAmount: "1 250 000,00",
      totalRubAmount: "987 654,32",
      cashbackPercent: "3,00",
      cashbackAmount: "29 629,63",
      cashbackCurrency: "RUB",
      comments: "Срочная отгрузка, согласовано с логистикой.",
      itemsCount: 3,
    },
    product: {
      name: "Футболка женская оверсайз",
      sku: "FW-OS-2026",
      type: PRODUCT_TYPE_LABELS.SEWING,
      composition: "95% хлопок, 5% эластан",
      color: "белый",
      hsCode: "6109100009",
    },
    countryOfOrigin: COUNTRY_OF_ORIGIN,
    items: [
      {
        sku: "FW-OS-2026",
        name: "Футболка женская оверсайз",
        sizeCode: "M",
        color: "белый",
        quantity: 50,
        priceSom: "1 500,00",
        priceRub: "1 200,00",
        subtotalSom: "75 000,00",
        subtotalRub: "60 000,00",
      },
      {
        sku: "FW-OS-2026",
        name: "Футболка женская оверсайз",
        sizeCode: "L",
        color: "синий",
        quantity: 30,
        priceSom: "1 500,00",
        priceRub: "1 200,00",
        subtotalSom: "45 000,00",
        subtotalRub: "36 000,00",
      },
    ],
  };
}

/**
 * Контекст для генерации документа по реальному заказу.
 */
export async function buildOrderContext(orderId: string, user?: UserCtx) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: { include: { banks: { orderBy: { createdAt: "asc" }, take: 1 } } },
      factory: { include: { banks: { orderBy: { createdAt: "asc" }, take: 1 } } },
      items: {
        include: {
          product: true,
          variant: { include: { size: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!order) throw new Error("Заказ не найден");

  const clientBank = order.client.banks[0];
  const factoryBank = order.factory.banks[0];

  return {
    ...todayContext(),
    ...userContext(user),
    countryOfOrigin: COUNTRY_OF_ORIGIN,
    client: {
      companyName: order.client.companyName,
      inn: order.client.inn ?? "",
      ogrnip: order.client.ogrnip ?? "",
      legalAddress: order.client.legalAddress ?? "",
      email: order.client.email ?? "",
      phone: order.client.phone ?? "",
      bank: {
        bankName: clientBank?.bankName ?? "",
        bic: clientBank?.bic ?? "",
        accountNumber: clientBank?.accountNumber ?? "",
        correspondentAccount: clientBank?.correspondentAccount ?? "",
      },
    },
    factory: {
      name: order.factory.name,
      contractCurrency: order.factory.contractCurrency,
      inn: order.factory.inn ?? "",
      legalAddress: order.factory.legalAddress ?? "",
      actualAddress: order.factory.actualAddress ?? "",
      email: order.factory.email ?? "",
      phone: order.factory.phone ?? "",
      paymentTerms: order.factory.paymentTerms ?? "",
      bank: {
        bankName: factoryBank?.bankName ?? "",
        bic: factoryBank?.bic ?? "",
        accountNumber: factoryBank?.accountNumber ?? "",
        correspondentAccount: factoryBank?.correspondentAccount ?? "",
        correspondentBank: factoryBank?.correspondentBank ?? "",
      },
    },
    order: {
      orderNumber: order.orderNumber,
      orderDate: format(order.orderDate, "dd.MM.yyyy", { locale: ru }),
      name: order.name ?? "",
      status: ORDER_STATUS_LABELS[order.status] ?? order.status,
      totalSomAmount: fmt(order.totalSomAmount),
      totalRubAmount: fmt(order.totalRubAmount),
      cashbackPercent: order.cashbackPercent ? fmt(order.cashbackPercent) : "",
      cashbackAmount: order.cashbackAmount ? fmt(order.cashbackAmount) : "",
      cashbackCurrency: order.cashbackCurrency ?? "",
      comments: order.comments ?? "",
      itemsCount: order.items.length,
    },
    // Если хотя бы одна позиция — заполняем product первой
    product: order.items[0]
      ? {
          name: order.items[0].product.name,
          sku: order.items[0].product.sku,
          type: PRODUCT_TYPE_LABELS[order.items[0].product.type] ?? "",
          composition: order.items[0].product.composition ?? "",
          color: order.items[0].product.color ?? "",
          hsCode: order.items[0].product.hsCode ?? "",
        }
      : {
          name: "",
          sku: "",
          type: "",
          composition: "",
          color: "",
          hsCode: "",
        },
    items: order.items.map((it) => ({
      sku: it.product.sku,
      name: it.product.name,
      sizeCode: it.sizeCode || it.variant?.size?.sizeCode || "",
      color: it.color || it.variant?.color || "",
      quantity: it.quantity,
      priceSom: fmt(it.priceSom),
      priceRub: fmt(it.priceRub),
      subtotalSom: fmt(it.subtotalSom),
      subtotalRub: fmt(it.subtotalRub),
    })),
    _meta: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
  };
}
