import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Регистрация шрифтов с кириллицей для @react-pdf/renderer.
 *
 * Используется Roboto из npm-пакета `@fontsource/roboto` — он включает .ttf
 * файлы со всеми поддиапазонами (latin, cyrillic, и т.д.).
 *
 * Регистрация идемпотентна.
 */

let registered = false;

export function registerPdfFonts() {
  if (registered) return;

  const robotoDir = path.dirname(
    require.resolve("@fontsource/roboto/package.json"),
  );

  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: path.join(robotoDir, "files/roboto-cyrillic-400-normal.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(robotoDir, "files/roboto-cyrillic-700-normal.ttf"),
        fontWeight: 700,
      },
    ],
  });

  // Для случаев, когда нужно явно сказать «без переноса по дефисам»
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
