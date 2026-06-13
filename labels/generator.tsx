import { prisma } from "@/lib/prisma";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { saveBuffer } from "@/lib/storage";
import { COUNTRY_OF_ORIGIN } from "@/lib/constants";
import { storeGeneratedDocument } from "@/modules/documents/service";
import { LabelPdf, type LabelData } from "./pdf/label";
import type { LabelInput } from "./schemas";

type GenerateResult = {
  pdfBuffer: Buffer;
  fileName: string;
  storageKey?: string;
  documentId?: string;
};

/**
 * Сгенерировать PDF-этикетку из карточки товара.
 *
 * Если `saveToArchive=true`, файл сохраняется как версия документа типа
 * `CERTIFICATE` со ссылкой на товар (через метаданные).
 */
export async function generateLabel(input: LabelInput, userId?: string): Promise<GenerateResult> {
  registerPdfFonts();

  const [product, client] = await Promise.all([
    prisma.product.findUnique({
      where: { id: input.productId },
      include: { factory: true },
    }),
    prisma.client.findUnique({ where: { id: input.clientId } }),
  ]);

  if (!product) throw new Error("Товар не найден");
  if (!client) throw new Error("Клиент не найден");

  const data: LabelData = {
    productName: product.name,
    sku: product.sku,
    sizeCode: input.sizeCode,
    color: input.color,
    composition: product.composition || "Состав не указан",
    countryOfOrigin: COUNTRY_OF_ORIGIN,
    manufacturer: product.factory.name,
    manufacturerAddress:
      product.factory.legalAddress ??
      product.factory.actualAddress ??
      "адрес не указан",
    importer: client.companyName,
    importerAddress: client.legalAddress ?? "адрес не указан",
    productionMonth: input.productionMonth,
  };

  const pdfBuffer = await renderPdfToBuffer(<LabelPdf data={data} />);
  const fileName = `label-${product.sku}-${input.sizeCode}-${input.color}.pdf`.replace(/\s+/g, "_");

  if (!input.saveToArchive) {
    return { pdfBuffer, fileName };
  }

  // Сохраняем как документ типа LABEL (вшивная бирка)
  const result = await storeGeneratedDocument({
    orderId: null,
    documentTypeCode: "LABEL",
    title: `Этикетка — ${product.sku} (${input.sizeCode}/${input.color})`,
    pdfBuffer,
    fileName,
    generationContext: {
      productId: product.id,
      sku: product.sku,
      sizeCode: input.sizeCode,
      color: input.color,
      productionMonth: input.productionMonth,
      clientId: client.id,
      generatedAt: new Date().toISOString(),
    },
    userId,
  });

  // Дополнительно сохраним в storage отдельно для прямой отдачи (опционально)
  const saved = await saveBuffer(
    "labels",
    product.id,
    pdfBuffer,
    fileName,
    "application/pdf",
  );

  return {
    pdfBuffer,
    fileName,
    storageKey: saved.storageKey,
    documentId: result.documentId,
  };
}
