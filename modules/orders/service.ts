import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDecimal, decimalToString } from "@/lib/decimal";
import type { OrderInput } from "./schemas";

/**
 * Бизнес-логика модуля «Заказы».
 *
 * Особенности:
 *   - Номер заказа генерируется автоматически: ORD-YYYY-NNNNN
 *   - Суммы подсчитываются из позиций детерминированно
 *   - Каждое изменение записывается в OrderHistory (append-only)
 *   - Кэшбэк хранится snapshot'ом ПО ЗАКАЗУ (независимо от фабрики)
 */

type TxClient = Prisma.TransactionClient;

async function generateOrderNumber(tx: TxClient | typeof prisma): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;

  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.orderNumber.split("-");
    const lastNum = Number(parts[2] ?? "0");
    if (Number.isFinite(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}${nextNum.toString().padStart(5, "0")}`;
}

async function logHistory(
  tx: TxClient,
  orderId: string,
  changedById: string | undefined,
  changeType: string,
  options: {
    fieldName?: string;
    oldValue?: unknown;
    newValue?: unknown;
    description?: string;
  } = {},
) {
  await tx.orderHistory.create({
    data: {
      orderId,
      changedById: changedById ?? null,
      changeType,
      fieldName: options.fieldName ?? null,
      oldValue: options.oldValue !== undefined ? JSON.stringify(options.oldValue) : null,
      newValue: options.newValue !== undefined ? JSON.stringify(options.newValue) : null,
      description: options.description ?? null,
    },
  });
}

function computeItemTotals(items: OrderInput["items"]) {
  let totalSom = toDecimal(0);
  let totalRub = toDecimal(0);
  const prepared = items.map((item) => {
    const priceSom = toDecimal(item.priceSom || "0");
    const priceRub = toDecimal(item.priceRub || "0");
    const subtotalSom = priceSom.times(item.quantity);
    const subtotalRub = priceRub.times(item.quantity);
    totalSom = totalSom.plus(subtotalSom);
    totalRub = totalRub.plus(subtotalRub);
    return { ...item, priceSom, priceRub, subtotalSom, subtotalRub };
  });
  return { prepared, totalSom, totalRub };
}

function normalizeCashback(input: OrderInput) {
  const hasPercent = input.cashbackPercent && input.cashbackPercent !== "";
  const hasAmount = input.cashbackAmount && input.cashbackAmount !== "";
  return {
    cashbackPercent: hasPercent ? toDecimal(input.cashbackPercent!) : null,
    cashbackAmount: hasAmount ? toDecimal(input.cashbackAmount!) : null,
    cashbackCurrency:
      hasPercent || hasAmount
        ? input.cashbackCurrency && input.cashbackCurrency !== ""
          ? input.cashbackCurrency
          : "RUB"
        : null,
  };
}

export async function listOrders(filters?: {
  search?: string;
  status?: string;
  factoryId?: string;
  clientId?: string;
}) {
  return prisma.order.findMany({
    where: {
      status: filters?.status || undefined,
      factoryId: filters?.factoryId || undefined,
      clientId: filters?.clientId || undefined,
      OR: filters?.search
        ? [
            { orderNumber: { contains: filters.search, mode: "insensitive" } },
            { name: { contains: filters.search, mode: "insensitive" } },
            { client: { companyName: { contains: filters.search, mode: "insensitive" } } },
            { factory: { name: { contains: filters.search, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: {
      client: { select: { id: true, companyName: true } },
      factory: { select: { id: true, name: true } },
      _count: { select: { items: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      factory: true,
      createdBy: { select: { id: true, fullName: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { include: { size: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      documents: {
        include: {
          documentType: true,
          currentVersion: true,
        },
        orderBy: { createdAt: "desc" },
      },
      history: {
        include: { changedBy: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
}

export async function createOrder(input: OrderInput, userId?: string) {
  const { prepared, totalSom, totalRub } = computeItemTotals(input.items);
  const cashback = normalizeCashback(input);

  // Цикл повтора при коллизии уникального номера (минимальная защита от гонок)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            factoryId: input.factoryId,
            clientId: input.clientId,
            orderDate: new Date(input.orderDate),
            name: input.name?.trim() || null,
            status: input.status,
            comments: input.comments?.trim() || null,
            totalSomAmount: totalSom,
            totalRubAmount: totalRub,
            cashbackPercent: cashback.cashbackPercent,
            cashbackAmount: cashback.cashbackAmount,
            cashbackCurrency: cashback.cashbackCurrency,
            createdById: userId,
            items: {
              create: prepared.map((item, i) => ({
                productId: item.productId,
                variantId: item.variantId || null,
                sizeCode: item.sizeCode?.trim() || null,
                color: item.color?.trim() || null,
                quantity: item.quantity,
                priceSom: item.priceSom,
                priceRub: item.priceRub,
                subtotalSom: item.subtotalSom,
                subtotalRub: item.subtotalRub,
                sortOrder: i,
              })),
            },
          },
        });

        await logHistory(tx, order.id, userId, "CREATED", {
          description: `Заказ создан с ${prepared.length} позициями`,
        });

        return order;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 4
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Не удалось сгенерировать уникальный номер заказа");
}

export async function updateOrder(id: string, input: OrderInput, userId?: string) {
  const { prepared, totalSom, totalRub } = computeItemTotals(input.items);
  const cashback = normalizeCashback(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id },
      include: {
        items: true,
        factory: { select: { id: true, name: true } },
        client: { select: { id: true, companyName: true } },
      },
    });
    if (!existing) throw new Error("Заказ не найден");

    // Подгружаем имена для новых фабрики/клиента, если они изменились,
    // чтобы в истории фиксировать читаемые названия, а не CUID.
    const [nextFactory, nextClient] = await Promise.all([
      existing.factoryId !== input.factoryId
        ? tx.factory.findUnique({ where: { id: input.factoryId }, select: { name: true } })
        : Promise.resolve({ name: existing.factory.name }),
      existing.clientId !== input.clientId
        ? tx.client.findUnique({ where: { id: input.clientId }, select: { companyName: true } })
        : Promise.resolve({ companyName: existing.client.companyName }),
    ]);

    // Лог изменений верхнеуровневых полей
    const changes: Array<{ field: string; old: unknown; next: unknown; label: string }> = [
      {
        field: "factoryId",
        old: { id: existing.factoryId, name: existing.factory.name },
        next: { id: input.factoryId, name: nextFactory?.name ?? input.factoryId },
        label: "Фабрика",
      },
      {
        field: "clientId",
        old: { id: existing.clientId, name: existing.client.companyName },
        next: { id: input.clientId, name: nextClient?.companyName ?? input.clientId },
        label: "Клиент",
      },
      {
        field: "orderDate",
        old: existing.orderDate.toISOString(),
        next: new Date(input.orderDate).toISOString(),
        label: "Дата заказа",
      },
      { field: "name", old: existing.name, next: input.name?.trim() || null, label: "Название" },
      {
        field: "comments",
        old: existing.comments,
        next: input.comments?.trim() || null,
        label: "Комментарий",
      },
      {
        field: "cashbackPercent",
        old: decimalToString(existing.cashbackPercent),
        next: cashback.cashbackPercent ? cashback.cashbackPercent.toString() : "",
        label: "Кэшбэк, %",
      },
      {
        field: "cashbackAmount",
        old: decimalToString(existing.cashbackAmount),
        next: cashback.cashbackAmount ? cashback.cashbackAmount.toString() : "",
        label: "Кэшбэк, сумма",
      },
      {
        field: "cashbackCurrency",
        old: existing.cashbackCurrency,
        next: cashback.cashbackCurrency,
        label: "Валюта кэшбэка",
      },
    ];

    for (const c of changes) {
      if (JSON.stringify(c.old) !== JSON.stringify(c.next)) {
        await logHistory(tx, id, userId, "FIELD_CHANGE", {
          fieldName: c.field,
          oldValue: c.old,
          newValue: c.next,
          description: `${c.label} изменено`,
        });
      }
    }

    // Лог изменения статуса (отдельной записью)
    if (existing.status !== input.status) {
      await logHistory(tx, id, userId, "STATUS_CHANGE", {
        fieldName: "status",
        oldValue: existing.status,
        newValue: input.status,
        description: `Статус: ${existing.status} → ${input.status}`,
      });
    }

    // Заменяем позиции
    const itemsChanged =
      existing.items.length !== prepared.length ||
      existing.items.some((old, i) => {
        const next = prepared[i];
        if (!next) return true;
        return (
          old.productId !== next.productId ||
          old.quantity !== next.quantity ||
          old.priceSom.toString() !== next.priceSom.toString() ||
          old.priceRub.toString() !== next.priceRub.toString() ||
          (old.variantId ?? "") !== (next.variantId ?? "") ||
          (old.sizeCode ?? "") !== (next.sizeCode ?? "") ||
          (old.color ?? "") !== (next.color ?? "")
        );
      });

    await tx.orderItem.deleteMany({ where: { orderId: id } });

    const updated = await tx.order.update({
      where: { id },
      data: {
        factoryId: input.factoryId,
        clientId: input.clientId,
        orderDate: new Date(input.orderDate),
        name: input.name?.trim() || null,
        status: input.status,
        comments: input.comments?.trim() || null,
        totalSomAmount: totalSom,
        totalRubAmount: totalRub,
        cashbackPercent: cashback.cashbackPercent,
        cashbackAmount: cashback.cashbackAmount,
        cashbackCurrency: cashback.cashbackCurrency,
        items: {
          create: prepared.map((item, i) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            sizeCode: item.sizeCode?.trim() || null,
            color: item.color?.trim() || null,
            quantity: item.quantity,
            priceSom: item.priceSom,
            priceRub: item.priceRub,
            subtotalSom: item.subtotalSom,
            subtotalRub: item.subtotalRub,
            sortOrder: i,
          })),
        },
      },
    });

    if (itemsChanged) {
      await logHistory(tx, id, userId, "ITEMS_UPDATED", {
        oldValue: { count: existing.items.length },
        newValue: { count: prepared.length },
        description: `Позиции заказа изменены (${existing.items.length} → ${prepared.length})`,
      });
    }

    return updated;
  });
}

export async function changeOrderStatus(
  id: string,
  newStatus: string,
  comment: string | undefined,
  userId: string | undefined,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new Error("Заказ не найден");
    if (existing.status === newStatus) return;

    await tx.order.update({
      where: { id },
      data: { status: newStatus },
    });

    await logHistory(tx, id, userId, "STATUS_CHANGE", {
      fieldName: "status",
      oldValue: existing.status,
      newValue: newStatus,
      description: comment || `Статус: ${existing.status} → ${newStatus}`,
    });
  });
}

export async function deleteOrder(id: string) {
  // Полное удаление заказа разрешено только в статусе DRAFT — это снижает риск
  // потери истории по «живым» заказам.
  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, _count: { select: { documents: true } } },
  });
  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "DRAFT") {
    throw new Error("Удалять можно только заказы в статусе «Черновик»");
  }
  if (order._count.documents > 0) {
    throw new Error("Сначала удалите связанные документы (в архиве они останутся навсегда)");
  }
  await prisma.order.delete({ where: { id } });
}
