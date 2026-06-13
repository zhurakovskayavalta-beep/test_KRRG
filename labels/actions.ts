"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth-helpers";
import { labelSchema, type LabelInput } from "./schemas";
import { generateLabel } from "./generator";

export async function generateLabelAction(
  input: LabelInput,
): Promise<{ success: true; documentId?: string; storageKey?: string } | { success: false; error: string }> {
  const session = await requireAuth();
  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Проверьте корректность данных" };
  }
  try {
    const result = await generateLabel(parsed.data, session.user.id);
    revalidatePath("/documents");
    return {
      success: true,
      documentId: result.documentId,
      storageKey: result.storageKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось сгенерировать этикетку",
    };
  }
}
