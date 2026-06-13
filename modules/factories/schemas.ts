import { z } from "zod";
import { CURRENCIES } from "@/lib/constants";

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const factoryBankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Укажите наименование банка"),
  bic: z.string().min(1, "Укажите БИК"),
  accountNumber: z.string().min(1, "Укажите расчётный счёт"),
  correspondentAccount: z.string().min(1, "Укажите корреспондентский счёт"),
  correspondentBank: z.string().optional().or(z.literal("")),
  bankInn: z.string().optional().or(z.literal("")),
});

export const factorySchema = z.object({
  name: z.string().min(1, "Укажите название"),
  contractCurrency: z.enum(currencyCodes, {
    errorMap: () => ({ message: "Выберите валюту контракта" }),
  }),
  inn: z.string().optional().or(z.literal("")),
  legalAddress: z.string().optional().or(z.literal("")),
  actualAddress: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Некорректный email",
    ),
  phone: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().optional().or(z.literal("")),
  comments: z.string().optional().or(z.literal("")),
  banks: z.array(factoryBankAccountSchema).default([]),
});

export type FactoryInput = z.infer<typeof factorySchema>;
export type FactoryBankAccountInput = z.infer<typeof factoryBankAccountSchema>;
