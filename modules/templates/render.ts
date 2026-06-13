import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";

import { prisma } from "@/lib/prisma";
import { readFileBuffer, saveBuffer } from "@/lib/storage";
import { TEMPLATE_CATEGORY_TO_DOC_TYPE } from "@/lib/constants";
import { storeGeneratedDocument } from "@/modules/documents/service";
import { buildOrderContext, buildSampleContext } from "./context";

/**
 * Рендер Word-шаблона.
 *
 * Делимитеры: `{{ ... }}` (двойные фигурные скобки).
 * Циклы: `{{#items}} ... {{/items}}` (или `{#items}` без двойных при стандартной разметке).
 */

function renderDocx(templateBuffer: Buffer, context: unknown): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });
  doc.render(context as Record<string, unknown>);
  const generated = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return Buffer.isBuffer(generated) ? generated : Buffer.from(generated as Uint8Array);
}

async function loadCurrentTemplateBuffer(templateId: string): Promise<{
  buffer: Buffer;
  fileName: string;
  category: string;
  templateName: string;
}> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { currentVersion: true },
  });
  if (!template) throw new Error("Шаблон не найден");
  if (!template.currentVersion) {
    throw new Error("У шаблона ещё нет ни одной версии файла");
  }
  const buffer = await readFileBuffer(template.currentVersion.storageKey);
  return {
    buffer,
    fileName: template.currentVersion.fileName,
    category: template.category,
    templateName: template.name,
  };
}

/**
 * Сгенерировать предпросмотр шаблона с примерами данных.
 * Возвращает HTML, полученный из заполненного .docx через mammoth.
 */
export async function previewTemplate(
  templateId: string,
  user: { fullName?: string } | undefined,
): Promise<{ html: string; warnings: string[] }> {
  const { buffer } = await loadCurrentTemplateBuffer(templateId);
  const sample = buildSampleContext(user);
  const filledBuffer = renderDocx(buffer, sample);

  const result = await mammoth.convertToHtml({ buffer: filledBuffer });
  return {
    html: result.value,
    warnings: result.messages.map((m) => m.message),
  };
}

/**
 * Сгенерировать предпросмотр шаблона с данными конкретного заказа (без сохранения).
 */
export async function previewTemplateForOrder(
  templateId: string,
  orderId: string,
  user: { fullName?: string } | undefined,
): Promise<{ html: string; warnings: string[] }> {
  const { buffer } = await loadCurrentTemplateBuffer(templateId);
  const ctx = await buildOrderContext(orderId, user);
  const filledBuffer = renderDocx(buffer, ctx);

  const result = await mammoth.convertToHtml({ buffer: filledBuffer });
  return {
    html: result.value,
    warnings: result.messages.map((m) => m.message),
  };
}

/**
 * Сгенерировать документ по заказу и сохранить в архив.
 *
 * Соответствие категории шаблона → типу документа определяется в
 * `TEMPLATE_CATEGORY_TO_DOC_TYPE`. Если документ этого типа для этого
 * заказа уже существует — добавится новая версия.
 */
export async function renderTemplateForOrder(
  templateId: string,
  orderId: string,
  user: { id?: string; fullName?: string } | undefined,
) {
  const { buffer, category, templateName } = await loadCurrentTemplateBuffer(templateId);
  const ctx = await buildOrderContext(orderId, user);
  const filledBuffer = renderDocx(buffer, ctx);

  const docTypeCode = TEMPLATE_CATEGORY_TO_DOC_TYPE[category] ?? "OTHER";

  // Сохраняем сначала в отдельную папку, чтобы файл точно остался даже
  // если сохранение в архив упадёт — потом его можно восстановить.
  await saveBuffer(
    "templates-rendered",
    templateId,
    filledBuffer,
    `rendered-${ctx._meta.orderNumber}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );

  const result = await storeGeneratedDocument({
    orderId: ctx._meta.orderId,
    documentTypeCode: docTypeCode,
    title: `${templateName} — ${ctx._meta.orderNumber}`,
    documentNumber: ctx._meta.orderNumber,
    pdfBuffer: filledBuffer, // в этом случае это .docx, mime указываем явно ниже
    fileName: `${templateName}-${ctx._meta.orderNumber}.docx`.replace(/\s+/g, "_"),
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    generationContext: {
      templateId,
      templateName,
      templateCategory: category,
      orderId,
      orderNumber: ctx._meta.orderNumber,
      generatedAt: new Date().toISOString(),
    },
    userId: user?.id,
  });

  return result;
}
