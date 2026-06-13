import { prisma } from "@/lib/prisma";
import type { ClientInput } from "./schemas";

/**
 * Бизнес-логика модуля «Клиенты».
 *
 * Все операции с банковскими счетами — атомарны: создание/обновление
 * клиента и его счетов происходит в одной транзакции.
 */

function normalize(input: ClientInput) {
  return {
    companyName: input.companyName.trim(),
    inn: input.inn?.trim() || null,
    ogrnip: input.ogrnip?.trim() || null,
    legalAddress: input.legalAddress?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    comment: input.comment?.trim() || null,
  };
}

export async function listClients(search?: string) {
  return prisma.client.findMany({
    where: search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { inn: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { banks: true, orders: true } },
    },
    orderBy: { companyName: "asc" },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      banks: { orderBy: { createdAt: "asc" } },
      _count: { select: { orders: true, products: true } },
    },
  });
}

export async function createClient(input: ClientInput) {
  return prisma.client.create({
    data: {
      ...normalize(input),
      banks: {
        create: input.banks.map((b) => ({
          bankName: b.bankName.trim(),
          bic: b.bic.trim(),
          accountNumber: b.accountNumber.trim(),
          correspondentAccount: b.correspondentAccount.trim(),
        })),
      },
    },
    include: { banks: true },
  });
}

export async function updateClient(id: string, input: ClientInput) {
  // Заменяем банки целиком (удаляем старые, создаём из input):
  // удержание исторических банков не требуется — это не финансовый аудит.
  return prisma.$transaction(async (tx) => {
    await tx.clientBank.deleteMany({ where: { clientId: id } });
    return tx.client.update({
      where: { id },
      data: {
        ...normalize(input),
        banks: {
          create: input.banks.map((b) => ({
            bankName: b.bankName.trim(),
            bic: b.bic.trim(),
            accountNumber: b.accountNumber.trim(),
            correspondentAccount: b.correspondentAccount.trim(),
          })),
        },
      },
      include: { banks: true },
    });
  });
}

export async function deleteClient(id: string) {
  // Запрещаем удаление, если есть связанные заказы или товары.
  const counts = await prisma.client.findUnique({
    where: { id },
    select: { _count: { select: { orders: true, products: true } } },
  });
  if (!counts) {
    throw new Error("Клиент не найден");
  }
  if (counts._count.orders > 0 || counts._count.products > 0) {
    throw new Error(
      "Невозможно удалить клиента: с ним связаны заказы или товары",
    );
  }
  await prisma.client.delete({ where: { id } });
}
