import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { formatNumber } from "@/lib/format";
import { decimalToString } from "@/lib/decimal";
import { storeGeneratedDocument } from "./service";
import { SpecificationPdf, type SpecificationData } from "./pdf/specification";

function fmt(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return "0,00";
  return formatNumber(value);
}

/**
 * Сгенерировать PDF спецификации по заказу и сохранить как версию документа.
 * Если документ типа SPECIFICATION уже существует для заказа — создаёт
 * новую версию (старые НЕ удаляются).
 */
export async function generateSpecificationForOrder(orderId: string, userId?: string) {
  registerPdfFonts();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      factory: true,
      items: {
        include: {
          product: { select: { name: true, sku: true } },
          variant: { include: { size: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!order) throw new Error("Заказ не найден");

  const data: SpecificationData = {
    orderNumber: order.orderNumber,
    orderDate: format(order.orderDate, "dd.MM.yyyy", { locale: ru }),
    orderName: order.name,
    clientName: order.client.companyName,
    clientAddress: order.client.legalAddress,
    clientInn: order.client.inn,
    factoryName: order.factory.name,
    factoryAddress: order.factory.legalAddress ?? order.factory.actualAddress,
    factoryInn: order.factory.inn,
    factoryCurrency: order.factory.contractCurrency,
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
    totalSom: fmt(order.totalSomAmount),
    totalRub: fmt(order.totalRubAmount),
    cashbackPercent: order.cashbackPercent ? fmt(order.cashbackPercent) : null,
    cashbackAmount: order.cashbackAmount ? fmt(order.cashbackAmount) : null,
    cashbackCurrency: order.cashbackCurrency,
    comments: order.comments,
    generatedAt: format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru }),
  };

  const pdfBuffer = await renderPdfToBuffer(<SpecificationPdf data={data} />);

  const result = await storeGeneratedDocument({
    orderId: order.id,
    documentTypeCode: "SPECIFICATION",
    title: `Спецификация — ${order.orderNumber}`,
    documentNumber: order.orderNumber,
    pdfBuffer,
    fileName: `specification-${order.orderNumber}.pdf`,
    generationContext: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemsCount: order.items.length,
      totalRub: decimalToString(order.totalRubAmount),
      totalSom: decimalToString(order.totalSomAmount),
      generatedAt: new Date().toISOString(),
    },
    userId,
  });

  return result;
}
