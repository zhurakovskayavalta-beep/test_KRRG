import { z } from "zod";

export const documentSchema = z.object({
  title: z.string().min(1, "Введите название документа"),
  documentTypeId: z.string().min(1, "Выберите тип документа"),
  documentNumber: z.string().optional().or(z.literal("")),
  orderId: z.string().optional().or(z.literal("")),
});

export type DocumentInput = z.infer<typeof documentSchema>;
