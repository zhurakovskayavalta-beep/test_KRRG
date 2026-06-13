import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import type { TemplateInput } from "./schemas";

/**
 * Бизнес-логика модуля «Шаблоны».
 *
 *   - Версии (`TemplateVersion`) — append-only, файлы НИКОГДА не перезаписываются.
 *   - В каждой категории может быть только один активный шаблон.
 *     При активации одного — снимаем флаг с других в этой же категории.
 *   - Удалить шаблон можно, но история скачиваемых из его версий файлов
 *     остаётся в архиве документов (там, где сохранено).
 */

export async function listTemplates(filters?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}) {
  return prisma.template.findMany({
    where: {
      category: filters?.category || undefined,
      isActive: filters?.activeOnly ? true : undefined,
      OR: filters?.search
        ? [
            { name: { contains: filters.search, mode: "insensitive" } },
            { code: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      currentVersion: true,
      createdBy: { select: { id: true, fullName: true } },
      _count: { select: { versions: true } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getTemplateById(id: string) {
  return prisma.template.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      createdBy: { select: { id: true, fullName: true } },
      versions: {
        include: { uploadedBy: { select: { id: true, fullName: true } } },
        orderBy: { version: "desc" },
      },
    },
  });
}

export async function getActiveTemplateForCategory(category: string) {
  return prisma.template.findFirst({
    where: { category, isActive: true },
    include: { currentVersion: true },
  });
}

function normalize(input: TemplateInput) {
  return {
    name: input.name.trim(),
    category: input.category,
    code: input.code?.trim() || null,
    description: input.description?.trim() || null,
  };
}

/**
 * Создать шаблон вместе с первым .docx файлом.
 */
export async function createTemplateWithFile(
  input: TemplateInput,
  file: File,
  userId: string | undefined,
) {
  const template = await prisma.template.create({
    data: {
      ...normalize(input),
      createdById: userId,
    },
  });

  try {
    const saved = await saveFile("templates", template.id, file);
    const version = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        uploadedById: userId,
      },
    });
    await prisma.template.update({
      where: { id: template.id },
      data: { currentVersionId: version.id },
    });
    return template;
  } catch (error) {
    await prisma.template.delete({ where: { id: template.id } }).catch(() => undefined);
    throw error;
  }
}

/**
 * Загрузить новую версию существующего шаблона.
 * Старая версия НЕ удаляется.
 */
export async function addTemplateVersion(
  templateId: string,
  file: File,
  notes: string | undefined,
  userId: string | undefined,
) {
  const existing = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
  if (!existing) throw new Error("Шаблон не найден");

  const nextVersion = (existing.versions[0]?.version ?? 0) + 1;
  const saved = await saveFile("templates", templateId, file);

  return prisma.$transaction(async (tx) => {
    const version = await tx.templateVersion.create({
      data: {
        templateId,
        version: nextVersion,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        notes: notes?.trim() || null,
        uploadedById: userId,
      },
    });

    await tx.template.update({
      where: { id: templateId },
      data: { currentVersionId: version.id },
    });

    return version;
  });
}

/**
 * Обновить метаданные шаблона (без файла).
 */
export async function updateTemplate(id: string, input: TemplateInput) {
  return prisma.template.update({
    where: { id },
    data: normalize(input),
  });
}

/**
 * Сделать шаблон активным в своей категории.
 * Снимает флаг isActive со всех остальных шаблонов той же категории.
 */
export async function setActiveTemplate(id: string) {
  const template = await prisma.template.findUnique({
    where: { id },
    select: { id: true, category: true },
  });
  if (!template) throw new Error("Шаблон не найден");

  return prisma.$transaction([
    prisma.template.updateMany({
      where: { category: template.category, isActive: true, NOT: { id } },
      data: { isActive: false },
    }),
    prisma.template.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);
}

export async function deactivateTemplate(id: string) {
  await prisma.template.update({ where: { id }, data: { isActive: false } });
}

export async function deleteTemplate(id: string) {
  // Версии каскадируются при удалении шаблона.
  // Сами файлы остаются на диске — они могут понадобиться для аудита
  // ранее сгенерированных документов.
  await prisma.template.delete({ where: { id } });
}
