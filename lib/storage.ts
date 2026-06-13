import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Файловое хранилище на локальной ФС.
 *
 * Все файлы хранятся в директории, заданной переменной окружения `STORAGE_DIR`
 * (по умолчанию — `./uploads` относительно корня проекта).
 *
 * Структура: `{STORAGE_DIR}/{category}/{entityId}/{uniqueName}`
 *
 * `storageKey` — относительный путь от `STORAGE_DIR`. Используется для
 * сохранения в БД и для извлечения файла. Никогда не содержит `..`.
 *
 * Будущая замена на S3/R2/Replit Object Storage делается заменой реализации
 * этих функций без изменения вызывающего кода.
 */

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? "./uploads");

export type StoredFile = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
};

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Zа-яА-Я0-9._-]/g, "_");
  return base.slice(0, 200) || "file";
}

function safeResolve(storageKey: string): string {
  const resolved = path.resolve(STORAGE_DIR, storageKey);
  if (!resolved.startsWith(STORAGE_DIR + path.sep) && resolved !== STORAGE_DIR) {
    throw new Error("Недопустимый путь к файлу");
  }
  return resolved;
}

/**
 * Сохранить файл в хранилище.
 *
 * @param category   — логическая категория (например, "products", "documents")
 * @param entityId   — id связанной сущности (для группировки)
 * @param file       — Web `File` или `Blob` с полем `name`
 */
export async function saveFile(
  category: string,
  entityId: string,
  file: File | Blob,
  originalName?: string,
): Promise<StoredFile> {
  const name = originalName ?? (file instanceof File ? file.name : "file");
  const fileName = sanitizeFileName(name);

  const ext = path.extname(fileName);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const storageKey = path.posix.join(category, entityId, uniqueName);

  const fullPath = safeResolve(storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(fullPath, buffer);

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    storageKey,
    fileName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buffer.length,
    checksum,
  };
}

/**
 * Сохранить уже подготовленный Buffer (например, сгенерированный PDF).
 */
export async function saveBuffer(
  category: string,
  entityId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<StoredFile> {
  const safeName = sanitizeFileName(fileName);
  const ext = path.extname(safeName);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const storageKey = path.posix.join(category, entityId, uniqueName);

  const fullPath = safeResolve(storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    storageKey,
    fileName: safeName,
    mimeType,
    sizeBytes: buffer.length,
    checksum,
  };
}

/**
 * Прочитать файл как поток для отдачи в HTTP-ответе.
 */
export function readFileStream(storageKey: string) {
  const fullPath = safeResolve(storageKey);
  return createReadStream(fullPath);
}

/**
 * Прочитать файл целиком (например, для встраивания в PDF).
 */
export async function readFileBuffer(storageKey: string): Promise<Buffer> {
  const fullPath = safeResolve(storageKey);
  return fs.readFile(fullPath);
}

/**
 * Получить метаданные файла на диске.
 */
export async function statFile(storageKey: string) {
  const fullPath = safeResolve(storageKey);
  return fs.stat(fullPath);
}

/**
 * Удалить файл из хранилища.
 *
 * ⚠ Использовать ТОЛЬКО для отката неудачной загрузки или удаления
 * связанной с активной сущностью записи. Версии документов из архива
 * не удаляются никогда — это нарушает гарантии целостности.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const fullPath = safeResolve(storageKey);
  await fs.unlink(fullPath).catch(() => undefined);
}
