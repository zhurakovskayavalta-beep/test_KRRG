"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import { translatePrismaError } from "@/lib/prisma-errors";
import * as service from "./service";
import { clientSchema, type ClientInput } from "./schemas";

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createClientAction(input: ClientInput): Promise<ActionResult> {
  await requireAuth();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    const client = await service.createClient(parsed.data);
    revalidatePath("/clients");
    return { success: true, id: client.id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось создать клиента"),
    };
  }
}

export async function updateClientAction(
  id: string,
  input: ClientInput,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    await service.updateClient(id, parsed.data);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось обновить клиента"),
    };
  }
}

export async function deleteClientAction(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deleteClient(id);
    revalidatePath("/clients");
  } catch (error) {
    return {
      success: false,
      error: translatePrismaError(error, "Не удалось удалить клиента"),
    };
  }
  redirect("/clients");
}
