import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Введите email")
    .email("Некорректный email"),
  password: z
    .string()
    .min(1, "Введите пароль")
    .min(6, "Пароль должен быть не короче 6 символов"),
});

export type LoginInput = z.infer<typeof loginSchema>;
