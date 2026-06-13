import { z } from "zod";

export const labelSchema = z.object({
  productId: z.string().min(1),
  clientId: z.string().min(1, "Выберите импортёра (клиента)"),
  sizeCode: z.string().min(1, "Выберите размер"),
  color: z.string().min(1, "Укажите цвет"),
  productionMonth: z.string().min(1, "Укажите месяц производства"),
  // Сохранять ли результат в архив (как PDF-документ)
  saveToArchive: z.boolean().default(true),
});

export type LabelInput = z.infer<typeof labelSchema>;
