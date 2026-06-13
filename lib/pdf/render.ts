import * as React from "react";
import { renderToStream } from "@react-pdf/renderer";

/**
 * Универсальный рендер @react-pdf/renderer в Buffer.
 *
 * Используем `renderToStream`, а не `renderToBuffer` или `pdf().toBuffer()` —
 * это самый стабильный API, доступный во всех актуальных версиях библиотеки.
 */
export async function renderPdfToBuffer(element: React.ReactElement): Promise<Buffer> {
  const stream = await renderToStream(element);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
