"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import { translatePrismaError } from "@/lib/prisma-errors";
import * as service from "./service";
import { productSchema, type ProductInput } from "./schemas";

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

function parseFormData(formData: FormData): {
  input: ProductInput | null;
  photoFiles: File[];
  certificateFile: File | null;
  validationError?: string;
} {
  const dataRaw = formData.get("data");
  if (typeof dataRaw !== "string") {
    return {
      input: null,
      photoFiles: [],
      certificateFile: null,
      validationError: "Отсутствуют данные формы",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataRaw);
  } catch {
    return {
      input: null,
      photoFiles: [],
      certificateFile: null,
      validationError: "Не удалось разобрать данные формы",
    };
  }

  const result = productSchema.safeParse(parsed);
  if (!result.success) {
    return {
      input: null,
      photoFiles: [],
      certificateFile: null,
      validationError: "Проверьте корректность данных",
    };
  }

  const photoFiles = formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  const certificateRaw = formData.get("certificate");
  const certificateFile =
    certificateRaw instanceof File && certificateRaw.size > 0 ? certificateRaw : null;

  return { input: result.data, photoFiles, certificateFile };
}

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const { input, photoFiles, certificateFile, validationError } = parseFormData(formData);
  if (!input) {
    return { success: false, error: validationError ?? "Некорректные данные" };
  }
  try {
    const product = await service.createProduct(input, photoFiles, certificateFile);
    revalidatePath("/products");
    return { success: true, id: product.id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось создать товар"),
    };
  }
}

export async function updateProductAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const { input, photoFiles, certificateFile, validationError } = parseFormData(formData);
  if (!input) {
    return { success: false, error: validationError ?? "Некорректные данные" };
  }
  try {
    await service.updateProduct(id, input, photoFiles, certificateFile);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось обновить товар"),
    };
  }
}

export async function deleteProductAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deleteProduct(id);
    revalidatePath("/products");
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось удалить товар"),
    };
  }
  redirect("/products");
}
