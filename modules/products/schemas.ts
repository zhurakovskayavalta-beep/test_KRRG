import { z } from "zod";

export const measurementsSchema = z.object({
  chest: z.number().nullable().optional(),   // обхват груди
  waist: z.number().nullable().optional(),   // обхват талии
  hips: z.number().nullable().optional(),    // обхват бёдер
  length: z.number().nullable().optional(),  // длина изделия
  sleeve: z.number().nullable().optional(),  // длина рукава
});

export const productSizeSchema = z.object({
  id: z.string().optional(),
  sizeCode: z.string().min(1, "Укажите размер"),
  measurements: measurementsSchema.default({}),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sizeCode: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  sku: z.string().optional().or(z.literal("")),
  barcode: z.string().optional().or(z.literal("")),
});

export const productSchema = z.object({
  factoryId: z.string().min(1, "Выберите фабрику"),
  clientId: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Укажите наименование"),
  sku: z.string().min(1, "Укажите артикул (SKU)"),
  type: z.enum(["SEWING", "KNITWEAR"], {
    errorMap: () => ({ message: "Выберите тип изделия" }),
  }),
  color: z.string().optional().or(z.literal("")),
  composition: z.string().optional().or(z.literal("")),
  hsCode: z.string().optional().or(z.literal("")),
  comment: z.string().optional().or(z.literal("")),
  sizes: z.array(productSizeSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
  removedPhotoIds: z.array(z.string()).default([]),
  removeCertificate: z.boolean().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductSizeInput = z.infer<typeof productSizeSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type Measurements = z.infer<typeof measurementsSchema>;
