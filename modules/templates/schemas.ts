import { z } from "zod";
import { TEMPLATE_CATEGORIES } from "@/lib/constants";

const categoryEnum = TEMPLATE_CATEGORIES as [string, ...string[]];

export const templateSchema = z.object({
  name: z.string().min(1, "Введите название шаблона"),
  category: z.enum(categoryEnum, {
    errorMap: () => ({ message: "Выберите категорию" }),
  }),
  code: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

export type TemplateInput = z.infer<typeof templateSchema>;

export const renderForOrderSchema = z.object({
  templateId: z.string().min(1),
  orderId: z.string().min(1),
});

export type RenderForOrderInput = z.infer<typeof renderForOrderSchema>;
