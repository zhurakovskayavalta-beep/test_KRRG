"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-helpers";
import * as service from "./service";
import { orderSchema, statusChangeSchema, type OrderInput, type StatusChangeInput } from "./schemas";

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createOrderAction(input: OrderInput): Promise<ActionResult> {
  const session = await requireAuth();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    const order = await service.createOrder(parsed.data, session.user.id);
    revalidatePath("/orders");
    return { success: true, id: order.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось создать заказ",
    };
  }
}

export async function updateOrderAction(
  id: string,
  input: OrderInput,
): Promise<ActionResult> {
  const session = await requireAuth();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    await service.updateOrder(id, parsed.data, session.user.id);
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось обновить заказ",
    };
  }
}

export async function changeOrderStatusAction(
  id: string,
  input: StatusChangeInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAuth();
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Некорректный статус" };
  }
  try {
    await service.changeOrderStatus(id, parsed.data.status, parsed.data.comment, session.user.id);
    revalidatePath(`/orders/${id}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось изменить статус",
    };
  }
}

export async function deleteOrderAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  try {
    await service.deleteOrder(id);
    revalidatePath("/orders");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось удалить заказ",
    };
  }
  redirect("/orders");
}
