"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import { documentSchema, type DocumentInput } from "./schemas";
import * as service from "./service";
import { generateSpecificationForOrder } from "./spec-generator";

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

function parseFormData(formData: FormData): {
  input: DocumentInput | null;
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
  const result = documentSchema.safeParse(parsed);
  if (!result.success) {
    return { input: null, file: null, error: "Проверьте корректность данных" };
  }
  const fileRaw = formData.get("file");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
  return { input: result.data, file };
}

export async function createDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await requireAuth();
  const { input, file, error } = parseFormData(formData);
  if (!input) return { success: false, error: error ?? "Некорректные данные" };
  if (!file) return { success: false, error: "Загрузите файл документа" };

  try {
    const doc = await service.createDocumentWithFile(input, file, session.user.id);
    revalidatePath("/documents");
    if (input.orderId) revalidatePath(`/orders/${input.orderId}`);
    return { success: true, id: doc.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сохранить документ",
    };
  }
}

export async function uploadDocumentVersionAction(
  documentId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAuth();
  const fileRaw = formData.get("file");
  if (!(fileRaw instanceof File) || fileRaw.size === 0) {
    return { success: false, error: "Выберите файл" };
  }
  try {
    await service.addDocumentVersion(documentId, fileRaw, session.user.id);
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/documents");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось загрузить версию",
    };
  }
}

export async function generateSpecificationAction(
  orderId: string,
): Promise<ActionResult> {
  const session = await requireAuth();
  try {
    const result = await generateSpecificationForOrder(orderId, session.user.id);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/documents");
    return { success: true, id: result.documentId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось сгенерировать спецификацию",
    };
  }
}

export async function setDocumentStatusAction(
  id: string,
  status: "ACTIVE" | "VOIDED" | "ARCHIVED",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.setDocumentStatus(id, status);
    revalidatePath(`/documents/${id}`);
    revalidatePath("/documents");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Не удалось обновить статус",
    };
  }
}
