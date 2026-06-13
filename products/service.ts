import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import type { ProductInput } from "./schemas";

/**
 * Бизнес-логика модуля «Товары».
 *
 * Связанные сущности: фотографии (несколько), размеры (с мерками),
 * варианты (размер × цвет), сертификат соответствия (один файл).
 *
 * При обновлении товара: размеры и варианты заменяются целиком (в одной
 * транзакции). Фотографии добавляются инкрементально; на удаление —
 * передаётся `removedPhotoIds`.
 */

function normalize(input: ProductInput) {
  return {
    factoryId: input.factoryId,
    clientId: input.clientId?.trim() || null,
    name: input.name.trim(),
    sku: input.sku.trim(),
    type: input.type,
    color: input.color?.trim() || null,
    composition: input.composition?.trim() || null,
    hsCode: input.hsCode?.trim() || null,
    comment: input.comment?.trim() || null,
  };
}

export async function listProducts(search?: string) {
  return prisma.product.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { composition: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      factory: { select: { id: true, name: true } },
      client: { select: { id: true, companyName: true } },
      photos: { take: 1, orderBy: { sortOrder: "asc" } },
      _count: { select: { sizes: true, variants: true, orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      factory: true,
      client: true,
      photos: { orderBy: { sortOrder: "asc" } },
      sizes: { orderBy: { sortOrder: "asc" } },
      variants: { include: { size: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { orderItems: true } },
    },
  });
}

export async function createProduct(
  input: ProductInput,
  photoFiles: File[],
  certificateFile: File | null,
) {
  // 1) Создаём товар без файлов
  const product = await prisma.product.create({
    data: {
      ...normalize(input),
      sizes: {
        create: input.sizes.map((s, i) => ({
          sizeCode: s.sizeCode.trim(),
          measurements: s.measurements as object,
          sortOrder: i,
        })),
      },
    },
    include: { sizes: true },
  });

  // 2) Привязываем варианты к созданным размерам (по sizeCode)
  if (input.variants.length > 0) {
    const sizeMap = new Map(product.sizes.map((s) => [s.sizeCode, s.id]));
    await prisma.productVariant.createMany({
      data: input.variants.map((v) => ({
        productId: product.id,
        sizeId: v.sizeCode ? sizeMap.get(v.sizeCode) ?? null : null,
        color: v.color?.trim() || null,
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
      })),
    });
  }

  // 3) Сохраняем фотографии
  if (photoFiles.length > 0) {
    const saved = await Promise.all(
      photoFiles.map((f) => saveFile("products", product.id, f)),
    );
    await prisma.productPhoto.createMany({
      data: saved.map((s, i) => ({
        productId: product.id,
        storageKey: s.storageKey,
        fileName: s.fileName,
        mimeType: s.mimeType,
        sizeBytes: s.sizeBytes,
        sortOrder: i,
      })),
    });
  }

  // 4) Сохраняем сертификат
  if (certificateFile) {
    const saved = await saveFile("products", product.id, certificateFile);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        certificateStorageKey: saved.storageKey,
        certificateFileName: saved.fileName,
        certificateMimeType: saved.mimeType,
        certificateSizeBytes: saved.sizeBytes,
      },
    });
  }

  return product;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  newPhotoFiles: File[],
  newCertificateFile: File | null,
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      certificateStorageKey: true,
      photos: { select: { id: true, storageKey: true } },
    },
  });
  if (!existing) {
    throw new Error("Товар не найден");
  }

  await prisma.$transaction(async (tx) => {
    // Заменяем размеры и варианты
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.productSize.deleteMany({ where: { productId: id } });

    await tx.product.update({
      where: { id },
      data: {
        ...normalize(input),
        sizes: {
          create: input.sizes.map((s, i) => ({
            sizeCode: s.sizeCode.trim(),
            measurements: s.measurements as object,
            sortOrder: i,
          })),
        },
      },
    });

    const updated = await tx.product.findUnique({
      where: { id },
      include: { sizes: true },
    });
    if (!updated) return;

    if (input.variants.length > 0) {
      const sizeMap = new Map(updated.sizes.map((s) => [s.sizeCode, s.id]));
      await tx.productVariant.createMany({
        data: input.variants.map((v) => ({
          productId: id,
          sizeId: v.sizeCode ? sizeMap.get(v.sizeCode) ?? null : null,
          color: v.color?.trim() || null,
          sku: v.sku?.trim() || null,
          barcode: v.barcode?.trim() || null,
        })),
      });
    }

    // Удаляем отмеченные фото
    if (input.removedPhotoIds.length > 0) {
      const toRemove = existing.photos.filter((p) =>
        input.removedPhotoIds.includes(p.id),
      );
      await tx.productPhoto.deleteMany({
        where: { id: { in: input.removedPhotoIds }, productId: id },
      });
      // Удаление файлов с диска — best-effort после транзакции
      Promise.all(toRemove.map((p) => deleteFile(p.storageKey))).catch(() => undefined);
    }

    // Удаляем сертификат, если попросили
    if (input.removeCertificate && existing.certificateStorageKey) {
      const oldKey = existing.certificateStorageKey;
      await tx.product.update({
        where: { id },
        data: {
          certificateStorageKey: null,
          certificateFileName: null,
          certificateMimeType: null,
          certificateSizeBytes: null,
        },
      });
      deleteFile(oldKey).catch(() => undefined);
    }
  });

  // Сохраняем новые файлы вне транзакции (диск — внешний ресурс)
  if (newPhotoFiles.length > 0) {
    const saved = await Promise.all(
      newPhotoFiles.map((f) => saveFile("products", id, f)),
    );
    const lastOrder = await prisma.productPhoto.count({ where: { productId: id } });
    await prisma.productPhoto.createMany({
      data: saved.map((s, i) => ({
        productId: id,
        storageKey: s.storageKey,
        fileName: s.fileName,
        mimeType: s.mimeType,
        sizeBytes: s.sizeBytes,
        sortOrder: lastOrder + i,
      })),
    });
  }

  if (newCertificateFile) {
    // Если был старый сертификат — удалим его файл (новая запись просто перезапишет поля)
    if (existing.certificateStorageKey && !input.removeCertificate) {
      deleteFile(existing.certificateStorageKey).catch(() => undefined);
    }
    const saved = await saveFile("products", id, newCertificateFile);
    await prisma.product.update({
      where: { id },
      data: {
        certificateStorageKey: saved.storageKey,
        certificateFileName: saved.fileName,
        certificateMimeType: saved.mimeType,
        certificateSizeBytes: saved.sizeBytes,
      },
    });
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      photos: { select: { storageKey: true } },
      _count: { select: { orderItems: true } },
    },
  });
  if (!product) {
    throw new Error("Товар не найден");
  }
  if (product._count.orderItems > 0) {
    throw new Error("Невозможно удалить товар: он используется в заказах");
  }

  await prisma.product.delete({ where: { id } });

  // Best-effort удаление файлов с диска
  Promise.all([
    ...product.photos.map((p) => deleteFile(p.storageKey)),
    product.certificateStorageKey
      ? deleteFile(product.certificateStorageKey)
      : Promise.resolve(),
  ]).catch(() => undefined);
}

/**
 * Используется в селекторах при создании заказа.
 */
export async function listProductsForSelect() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      color: true,
      composition: true,
      factory: { select: { id: true, name: true } },
      sizes: { select: { id: true, sizeCode: true }, orderBy: { sortOrder: "asc" } },
      variants: {
        select: { id: true, sizeId: true, color: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
