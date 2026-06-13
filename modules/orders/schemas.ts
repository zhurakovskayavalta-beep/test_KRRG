import { z } from "zod";
import { CURRENCIES, ORDER_STATUSES } from "@/lib/constants";

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v.toString() : v.trim()))
  .refine(
    (v) => v === "" || /^-?\d+(\.\d+)?$/.test(v),
    "Введите число (для дробной части используйте точку)",
  );

const positiveDecimalString = decimalString.refine(
  (v) => v === "" || Number(v) >= 0,
  "Сумма должна быть неотрицательной",
);

export const orderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Выберите товар"),
  variantId: z.string().optional().or(z.literal("")),
  sizeCode: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive("Количество должно быть положительным"),
  priceSom: positiveDecimalString,
  priceRub: positiveDecimalString,
});

export const orderSchema = z.object({
  factoryId: z.string().min(1, "Выберите фабрику"),
  clientId: z.string().min(1, "Выберите клиента"),
  orderDate: z.string().min(1, "Укажите дату заказа"),
  name: z.string().optional().or(z.literal("")),
  status: z.enum(ORDER_STATUSES as [string, ...string[]]).default("DRAFT"),
  cashbackPercent: decimalString.optional().or(z.literal("")),
  cashbackAmount: decimalString.optional().or(z.literal("")),
  cashbackCurrency: z.union([z.enum(currencyCodes), z.literal("")]).optional(),
  comments: z.string().optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы одну позицию"),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const statusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  comment: z.string().optional(),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
