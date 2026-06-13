import { prisma } from "@/lib/prisma";
import type { FactoryInput } from "./schemas";

function normalize(input: FactoryInput) {
  return {
    name: input.name.trim(),
    contractCurrency: input.contractCurrency,
    inn: input.inn?.trim() || null,
    legalAddress: input.legalAddress?.trim() || null,
    actualAddress: input.actualAddress?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    paymentTerms: input.paymentTerms?.trim() || null,
    comments: input.comments?.trim() || null,
  };
}

function normalizeBank(b: FactoryInput["banks"][number]) {
  return {
    bankName: b.bankName.trim(),
    bic: b.bic.trim(),
    accountNumber: b.accountNumber.trim(),
    correspondentAccount: b.correspondentAccount.trim(),
    correspondentBank: b.correspondentBank?.trim() || null,
    bankInn: b.bankInn?.trim() || null,
  };
}

export async function listFactories(search?: string) {
  return prisma.factory.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { inn: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { banks: true, products: true, orders: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getFactoryById(id: string) {
  return prisma.factory.findUnique({
    where: { id },
    include: {
      banks: { orderBy: { createdAt: "asc" } },
      _count: { select: { products: true, orders: true } },
    },
  });
}

export async function createFactory(input: FactoryInput) {
  return prisma.factory.create({
    data: {
      ...normalize(input),
      banks: { create: input.banks.map(normalizeBank) },
    },
    include: { banks: true },
  });
}

export async function updateFactory(id: string, input: FactoryInput) {
  return prisma.$transaction(async (tx) => {
    await tx.factoryBankAccount.deleteMany({ where: { factoryId: id } });
    return tx.factory.update({
      where: { id },
      data: {
        ...normalize(input),
        banks: { create: input.banks.map(normalizeBank) },
      },
      include: { banks: true },
    });
  });
}

export async function deleteFactory(id: string) {
  const counts = await prisma.factory.findUnique({
    where: { id },
    select: { _count: { select: { products: true, orders: true } } },
  });
  if (!counts) {
    throw new Error("Фабрика не найдена");
  }
  if (counts._count.products > 0 || counts._count.orders > 0) {
    throw new Error(
      "Невозможно удалить фабрику: к ней привязаны товары или заказы",
    );
  }
  await prisma.factory.delete({ where: { id } });
}
