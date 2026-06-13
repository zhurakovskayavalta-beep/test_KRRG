import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Line,
  Polygon,
  Rect,
  G,
} from "@react-pdf/renderer";

/**
 * PDF этикетки для вшивания в изделие.
 *
 * Соответствие ТР ТС 017/2011 «О безопасности продукции лёгкой промышленности»:
 *   - Наименование товара
 *   - Артикул, размер, состав, цвет
 *   - Страна изготовления
 *   - Изготовитель + адрес
 *   - Импортёр + адрес
 *   - Дата изготовления
 *   - Знак ЕАС (соответствие ЕАЭС)
 *   - Символы по уходу (ISO 3758)
 *
 * Печатается на A4, по одному большому образцу по центру. При тираже
 * можно изменить layout на 4-up или 8-up в будущем.
 */

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  cropMark: {
    position: "absolute",
    width: 12,
    height: 12,
    borderColor: "#999",
  },
  label: {
    width: 300, // 105mm × ~ 75mm
    minHeight: 380,
    marginHorizontal: "auto",
    marginTop: 40,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 1,
  },
  productName: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    marginVertical: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label_: { width: 90, color: "#555", fontSize: 8 },
  value: { flex: 1, fontSize: 9 },
  block: { marginBottom: 8 },
  blockTitle: {
    fontSize: 7,
    color: "#777",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  blockText: { fontSize: 9, lineHeight: 1.4 },
  symbolsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#999",
  },
  symbolBox: {
    alignItems: "center",
    width: 50,
  },
  symbolCaption: {
    fontSize: 6,
    color: "#555",
    textAlign: "center",
    marginTop: 2,
  },
  eacBox: {
    alignItems: "center",
    marginTop: 14,
  },
  eacCaption: {
    fontSize: 7,
    marginTop: 2,
    color: "#555",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
    fontSize: 6,
    color: "#aaa",
    textAlign: "center",
  },
});

export type LabelData = {
  productName: string;
  sku: string;
  sizeCode: string;
  color: string;
  composition: string;
  countryOfOrigin: string;     // например, "Кыргызстан"
  manufacturer: string;        // фабрика
  manufacturerAddress: string; // адрес фабрики
  importer: string;            // клиент
  importerAddress: string;     // адрес клиента
  productionMonth: string;     // например, "Июнь 2026"
  brand?: string;              // если не указан — используется importer
};

/**
 * Знак ЕАС — стилизованное латинско-кириллическое отображение.
 * (Полноценный графический знак ЕАС защищён, тут — текстовый аналог,
 * который читается на этикетке и допустим как макет для согласования
 * перед заказом тиража.)
 */
function EacMark() {
  return (
    <View style={styles.eacBox}>
      <Svg width={48} height={32} viewBox="0 0 96 64">
        <G>
          {/* Стилизованные буквы Е А С */}
          <Path d="M 6 8 L 26 8 L 26 16 L 14 16 L 14 28 L 24 28 L 24 36 L 14 36 L 14 48 L 26 48 L 26 56 L 6 56 Z" fill="#000" />
          <Path d="M 36 56 L 46 8 L 56 8 L 66 56 L 56 56 L 54 46 L 48 46 L 46 56 Z M 49 38 L 53 38 L 51 24 Z" fill="#000" />
          <Path d="M 92 14 L 88 12 C 84 10 78 10 74 14 C 70 18 70 28 70 32 C 70 36 70 46 74 50 C 78 54 84 54 88 52 L 92 50 L 92 42 L 87 45 C 84 47 81 47 79 43 C 77 39 77 25 79 21 C 81 17 84 17 87 19 L 92 22 Z" fill="#000" />
        </G>
      </Svg>
      <Text style={styles.eacCaption}>Соответствует ТР ТС</Text>
    </View>
  );
}

/** Стирка тёплая ≤ 30°C — нежная (с одной чёрточкой под тазом) */
function WashSymbol() {
  return (
    <View style={styles.symbolBox}>
      <Svg width={28} height={28} viewBox="0 0 32 32">
        <Path d="M 3 9 Q 3 12 6 12 L 26 12 Q 29 12 29 9 L 28 9 L 28 18 Q 28 26 20 26 L 12 26 Q 4 26 4 18 L 4 9 Z" stroke="#000" strokeWidth={1.5} fill="none" />
        <Text x="10" y="20" style={{ fontSize: 8, fontFamily: "Roboto" }}>30°</Text>
        <Line x1="6" y1="29" x2="26" y2="29" stroke="#000" strokeWidth={1.2} />
      </Svg>
      <Text style={styles.symbolCaption}>Стирка 30°C{"\n"}деликатная</Text>
    </View>
  );
}

/** Не отбеливать — треугольник с двумя косыми линиями */
function NoBleachSymbol() {
  return (
    <View style={styles.symbolBox}>
      <Svg width={28} height={28} viewBox="0 0 32 32">
        <Polygon points="16,4 28,26 4,26" stroke="#000" strokeWidth={1.5} fill="none" />
        <Line x1="6" y1="6" x2="26" y2="26" stroke="#000" strokeWidth={1.5} />
        <Line x1="26" y1="6" x2="6" y2="26" stroke="#000" strokeWidth={1.5} />
      </Svg>
      <Text style={styles.symbolCaption}>Не отбеливать</Text>
    </View>
  );
}

/** Не сушить в машине — круг в квадрате, перечёркнутый крестом */
function NoTumbleSymbol() {
  return (
    <View style={styles.symbolBox}>
      <Svg width={28} height={28} viewBox="0 0 32 32">
        <Rect x={3} y={5} width={26} height={22} stroke="#000" strokeWidth={1.5} fill="none" />
        <Circle cx={16} cy={16} r={8} stroke="#000" strokeWidth={1.5} fill="none" />
        <Line x1="3" y1="5" x2="29" y2="27" stroke="#000" strokeWidth={1.6} />
        <Line x1="29" y1="5" x2="3" y2="27" stroke="#000" strokeWidth={1.6} />
      </Svg>
      <Text style={styles.symbolCaption}>Не сушить{"\n"}в машине</Text>
    </View>
  );
}

/** Глажка деликатная — утюг с одной точкой (низкая температура) */
function GentleIronSymbol() {
  return (
    <View style={styles.symbolBox}>
      <Svg width={28} height={28} viewBox="0 0 32 32">
        <Path d="M 4 22 L 8 12 Q 16 8 24 12 L 28 22 Z" stroke="#000" strokeWidth={1.5} fill="none" />
        <Line x1="3" y1="25" x2="29" y2="25" stroke="#000" strokeWidth={1.5} />
        <Circle cx={16} cy={17} r={1.2} fill="#000" />
      </Svg>
      <Text style={styles.symbolCaption}>Утюг{"\n"}деликатно</Text>
    </View>
  );
}

export function LabelPdf({ data }: { data: LabelData }) {
  return (
    <Document
      title={`Этикетка — ${data.sku}`}
      author="Import ERP"
      creator="Import ERP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.label}>
          <Text style={styles.brand}>{data.brand ?? data.importer}</Text>
          <Text style={styles.productName}>{data.productName}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label_}>Артикул</Text>
            <Text style={styles.value}>{data.sku}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label_}>Размер</Text>
            <Text style={styles.value}>{data.sizeCode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label_}>Цвет</Text>
            <Text style={styles.value}>{data.color}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label_}>Состав</Text>
            <Text style={styles.value}>{data.composition}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Изготовитель</Text>
            <Text style={styles.blockText}>{data.manufacturer}</Text>
            <Text style={styles.blockText}>{data.manufacturerAddress}</Text>
            <Text style={styles.blockText}>Страна: {data.countryOfOrigin}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Импортёр</Text>
            <Text style={styles.blockText}>{data.importer}</Text>
            <Text style={styles.blockText}>{data.importerAddress}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label_}>Дата изг.</Text>
            <Text style={styles.value}>{data.productionMonth}</Text>
          </View>

          <View style={styles.symbolsRow}>
            <WashSymbol />
            <NoBleachSymbol />
            <GentleIronSymbol />
            <NoTumbleSymbol />
          </View>

          <EacMark />
        </View>

        <Text style={styles.footer}>
          Макет этикетки для согласования. Артикул {data.sku} — {data.sizeCode} —{" "}
          {data.color}.
        </Text>
      </Page>
    </Document>
  );
}
