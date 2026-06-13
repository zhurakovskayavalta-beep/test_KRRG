import { z } from "zod";

export const clientBankSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Укажите наименование банка"),
  bic: z.string().min(1, "Укажите БИК"),
  accountNumber: z.string().min(1, "Укажите расчётный счёт"),
  correspondentAccount: z.string().min(1, "Укажите корреспондентский счёт"),
});

export const clientSchema = z.object({
  companyName: z.string().min(1, "Укажите название компании"),
  inn: z.string().optional().or(z.literal("")),
  ogrnip: z.string().optional().or(z.literal("")),
  legalAddress: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Некорректный email",
    ),
  phone: z.string().optional().or(z.literal("")),
  comment: z.string().optional().or(z.literal("")),
  banks: z.array(clientBankSchema).default([]),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientBankInput = z.infer<typeof clientBankSchema>;
