import { prisma } from "@/lib/prisma";
import { saveFile, saveBuffer } from "@/lib/storage";
import type { DocumentInput } from "./schemas";

/**
 * Бизнес-логика модуля «Документы».
 *
 * КРИТИЧНО:
 *   - `DocumentVersion` — append-only. Файлы НИКОГДА не перезаписываются.
 *   - Регенерация документа = создание следующей версии.
 *   - `currentVersionId` всегда указывает на последнюю активную версию,
 *     но все предыдущие остаются доступны для скачивания.
 *   - Удаление документа физически удаляет только метаданные. Файлы остаются
 *     на диске и могут быть восстановлены вручную (см. docs/архив).
 *     Для MVP допустимо удалять, но только пользователем с правами.
 */

export async function listDocuments(filters?: {
  search?: string;
  typeId?: string;
  category?: string;
  orderId?: string;
}) {
  return prisma.document.findMany({
    where: {
      orderId: filters?.orderId || undefined,
      documentTypeId: filters?.typeId || undefined,
      documentType: filters?.category ? { category: filters.category } : undefined,
      OR: filters?.search
        ? [
            { title: { contains: filters.search, mode: "insensitive" } },
            { documentNumber: { contains: filters.search, mode: "insensitive" } },
            { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: {
      documentType: true,
      currentVersion: true,
      order: { select: { id: true, orderNumber: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      documentType: true,
      order: { select: { id: true, orderNumber: true } },
      currentVersion: true,
      versions: {
        include: { uploadedBy: { select: { id: true, fullName: true } } },
        orderBy: { version: "desc" },
      },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function listDocumentTypes(options?: { activeOnly?: boolean }) {
  return prisma.documentType.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Создать новый документ с первой версией из загруженного файла.
 *
 * Поток: сначала создаём DB-запись документа (получаем id), затем сохраняем
 * файл под этим id. Если файл не сохранился — откатываем DB-запись.
 * Это гарантирует, что файлы группируются по id документа в хранилище.
 */
export async function createDocumentWithFile(
  input: DocumentInput,
  file: File,
  userId: string | undefined,
) {
  const doc = await prisma.document.create({
    data: {
      title: input.title.trim(),
      documentTypeId: input.documentTypeId,
      documentNumber: input.documentNumber?.trim() || null,
      orderId: input.orderId?.trim() || null,
      createdById: userId,
      status: "ACTIVE",
    },
  });

  try {
    const saved = await saveFile("documents", doc.id, file);
    const version = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        source: "UPLOAD",
        uploadedById: userId,
      },
    });
    await prisma.document.update({
      where: { id: doc.id },
      data: { currentVersionId: version.id },
    });
    return doc;
  } catch (error) {
    // Откатываем запись документа, если файл не удалось сохранить
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => undefined);
    throw error;
  }
}

/**
 * Загрузить новую версию существующего документа.
 * Старая версия НЕ удаляется — append-only архив.
 */
export async function addDocumentVersion(
  documentId: string,
  file: File,
  userId: string | undefined,
) {
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
  if (!existing) throw new Error("Документ не найден");

  const nextVersion = (existing.versions[0]?.version ?? 0) + 1;
  const saved = await saveFile("documents", documentId, file);

  return prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        source: "UPLOAD",
        uploadedById: userId,
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: { currentVersionId: version.id },
    });

    return version;
  });
}

/**
 * Сохранить сгенерированный системой PDF как новую версию документа.
 * Если документ ещё не существует — создаёт новый. Если существует — добавляет версию.
 *
 * @param sourceKey       — категория файла в хранилище (например, "specifications", "labels")
 * @param documentTypeCode — код типа документа из таблицы DocumentType
 */
export async function storeGeneratedDocument(params: {
  orderId: string | null;
  documentTypeCode: string;
  title: string;
  documentNumber?: string;
  pdfBuffer: Buffer;
  fileName: string;
  mimeType?: string;
  generationContext: Record<string, unknown>;
  userId: string | undefined;
}) {
  const docType = await prisma.documentType.findUnique({
    where: { code: params.documentTypeCode },
  });
  if (!docType) {
    throw new Error(`Тип документа «${params.documentTypeCode}» не найден`);
  }

  // Ищем существующий документ этого типа для этого заказа.
  let document = params.orderId
    ? await prisma.document.findFirst({
        where: {
          orderId: params.orderId,
          documentTypeId: docType.id,
          status: "ACTIVE",
        },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
        },
      })
    : null;

  const isNew = !document;
  if (!document) {
    document = await prisma.document.create({
      data: {
        title: params.title,
        documentTypeId: docType.id,
        documentNumber: params.documentNumber ?? null,
        orderId: params.orderId,
        createdById: params.userId,
        status: "ACTIVE",
      },
      include: { versions: true },
    });
  }

  const nextVersion = isNew ? 1 : (document.versions[0]?.version ?? 0) + 1;
  const saved = await saveBuffer(
    "documents",
    document.id,
    params.pdfBuffer,
    params.fileName,
    params.mimeType ?? "application/pdf",
  );

  return prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.create({
      data: {
        documentId: document!.id,
        version: nextVersion,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        source: "GENERATED",
        generationContext: params.generationContext as object,
        uploadedById: params.userId,
      },
    });

    await tx.document.update({
      where: { id: document!.id },
      data: { currentVersionId: version.id },
    });

    if (params.orderId) {
      await tx.orderHistory.create({
        data: {
          orderId: params.orderId,
          changedById: params.userId ?? null,
          changeType: isNew ? "DOCUMENT_ADDED" : "DOCUMENT_REGENERATED",
          fieldName: docType.code,
          description: `${docType.name} — версия ${nextVersion}`,
        },
      });
    }

    return { documentId: document!.id, versionId: version.id, version: nextVersion };
  });
}

/**
 * Изменение статуса документа (без удаления файлов).
 */
export async function setDocumentStatus(id: string, status: "ACTIVE" | "VOIDED" | "ARCHIVED") {
  await prisma.document.update({ where: { id }, data: { status } });
}
