"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import { translatePrismaError } from "@/lib/prisma-errors";
import * as service from "./service";
import { factorySchema, type FactoryInput } from "./schemas";

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createFactoryAction(input: FactoryInput): Promise<ActionResult> {
  await requireAuth();
  const parsed = factorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    const factory = await service.createFactory(parsed.data);
    revalidatePath("/factories");
    return { success: true, id: factory.id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось создать фабрику"),
    };
  }
}

export async function updateFactoryAction(
  id: string,
  input: FactoryInput,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = factorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    await service.updateFactory(id, parsed.data);
    revalidatePath("/factories");
    revalidatePath(`/factories/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось обновить фабрику"),
    };
  }
}

export async function deleteFactoryAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deleteFactory(id);
    revalidatePath("/factories");
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось удалить фабрику"),
    };
  }
  redirect("/factories");
}
