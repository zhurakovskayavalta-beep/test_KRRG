"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import { translatePrismaError } from "@/lib/prisma-errors";
import * as service from "./service";
import { templateSchema, type TemplateInput } from "./schemas";
import {
  previewTemplate,
  previewTemplateForOrder,
  renderTemplateForOrder,
} from "./render";

type ActionResult = { success: true; id: string } | { success: false; error: string };

function parseFormData(formData: FormData): {
  input: TemplateInput | null;
  file: File | null;
  error?: string;
} {
  const dataRaw = formData.get("data");
  if (typeof dataRaw !== "string") {
    return { input: null, file: null, error: "Отсутствуют данные формы" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataRaw);
  } catch {
    return { input: null, file: null, error: "Не удалось разобрать данные формы" };
  }
  const result = templateSchema.safeParse(parsed);
  if (!result.success) {
    return { input: null, file: null, error: "Проверьте корректность данных" };
  }
  const fileRaw = formData.get("file");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
  return { input: result.data, file };
}

function isDocxFile(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".docx")) return true;
  return file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export async function createTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await requireAuth();
  const { input, file, error } = parseFormData(formData);
  if (!input) return { success: false, error: error ?? "Некорректные данные" };
  if (!file) return { success: false, error: "Загрузите .docx файл шаблона" };
  if (!isDocxFile(file)) {
    return { success: false, error: "Поддерживаются только файлы формата .docx" };
  }
  try {
    const template = await service.createTemplateWithFile(input, file, session.user.id);
    revalidatePath("/templates");
    return { success: true, id: template.id };
  } catch (err) {
    return {
      success: false,
      error: translatePrismaError(err, "Не удалось создать шаблон"),
    };
  }
}

export async function updateTemplateAction(
  id: string,
  input: TemplateInput,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    await service.updateTemplate(id, parsed.data);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true, id };
  } catch (err) {
    return {
      success: false,
      error: translatePrismaError(err, "Не удалось обновить шаблон"),
    };
  }
}

export async function uploadTemplateVersionAction(
  templateId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAuth();
  const fileRaw = formData.get("file");
  if (!(fileRaw instanceof File) || fileRaw.size === 0) {
    return { success: false, error: "Выберите файл" };
  }
  if (!isDocxFile(fileRaw)) {
    return { success: false, error: "Поддерживаются только файлы формата .docx" };
  }
  const notes = formData.get("notes");
  try {
    await service.addTemplateVersion(
      templateId,
      fileRaw,
      typeof notes === "string" ? notes : undefined,
      session.user.id,
    );
    revalidatePath(`/templates/${templateId}`);
    revalidatePath("/templates");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить версию",
    };
  }
}

export async function setActiveTemplateAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.setActiveTemplate(id);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось активировать шаблон",
    };
  }
}

export async function deactivateTemplateAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deactivateTemplate(id);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось деактивировать шаблон",
    };
  }
}

export async function deleteTemplateAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deleteTemplate(id);
    revalidatePath("/templates");
  } catch (err) {
    return {
      success: false,
      error: translatePrismaError(err, "Не удалось удалить шаблон"),
    };
  }
  redirect("/templates");
}

/**
 * Сгенерировать предпросмотр с тестовыми данными.
 * Возвращает HTML для отображения.
 */
export async function previewTemplateAction(
  templateId: string,
): Promise<{ success: boolean; html?: string; warnings?: string[]; error?: string }> {
  const session = await requireAuth();
  try {
    const result = await previewTemplate(templateId, { fullName: session.user.fullName });
    return { success: true, html: result.html, warnings: result.warnings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сгенерировать предпросмотр",
    };
  }
}

export async function previewTemplateForOrderAction(
  templateId: string,
  orderId: string,
): Promise<{ success: boolean; html?: string; warnings?: string[]; error?: string }> {
  const session = await requireAuth();
  try {
    const result = await previewTemplateForOrder(templateId, orderId, {
      fullName: session.user.fullName,
    });
    return { success: true, html: result.html, warnings: result.warnings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сгенерировать предпросмотр",
    };
  }
}

/**
 * Сгенерировать документ из шаблона и заказа — сохранить в архив.
 */
export async function generateDocumentFromTemplateAction(
  templateId: string,
  orderId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  try {
    const result = await renderTemplateForOrder(templateId, orderId, {
      id: session.user.id,
      fullName: session.user.fullName,
    });
    revalidatePath("/documents");
    revalidatePath(`/orders/${orderId}`);
    return { success: true, id: result.documentId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сгенерировать документ",
    };
  }
}
