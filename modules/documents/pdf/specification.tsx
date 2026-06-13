import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/**
 * PDF-документ «Спецификация к заказу».
 *
 * Используется при автоматической генерации спецификации из данных заказа.
 * Все поля приходят как plain JS (Decimal сериализуется в string).
 */

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 32,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 140, color: "#555" },
  value: { flex: 1 },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 2,
  },
  th: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    fontWeight: 700,
    fontSize: 8,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cellSku: { width: 70 },
  cellName: { flex: 1 },
  cellSize: { width: 40, textAlign: "center" },
  cellColor: { width: 50 },
  cellQty: { width: 36, textAlign: "right" },
  cellPrice: { width: 60, textAlign: "right" },
  cellTotal: { width: 70, textAlign: "right", fontWeight: 700 },
  totals: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#1a1a1a",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  totalsLabel: { color: "#555", marginRight: 12 },
  totalsValue: { fontWeight: 700, width: 100, textAlign: "right" },
  signatures: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBox: { width: "45%" },
  sigLabel: { fontSize: 9, marginBottom: 20 },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingTop: 2,
    fontSize: 8,
    color: "#555",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
  },
});

export type SpecificationItem = {
  sku: string;
  name: string;
  sizeCode: string;
  color: string;
  quantity: number;
  priceSom: string;
  priceRub: string;
  subtotalSom: string;
  subtotalRub: string;
};

export type SpecificationData = {
  orderNumber: string;
  orderDate: string;
  orderName: string | null;
  clientName: string;
  clientAddress: string | null;
  clientInn: string | null;
  factoryName: string;
  factoryAddress: string | null;
  factoryInn: string | null;
  factoryCurrency: string;
  items: SpecificationItem[];
  totalSom: string;
  totalRub: string;
  cashbackPercent: string | null;
  cashbackAmount: string | null;
  cashbackCurrency: string | null;
  comments: string | null;
  generatedAt: string;
};

export function SpecificationPdf({ data }: { data: SpecificationData }) {
  return (
    <Document
      title={`Спецификация ${data.orderNumber}`}
      author="Import ERP"
      creator="Import ERP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>СПЕЦИФИКАЦИЯ к заказу № {data.orderNumber}</Text>
          <Text style={styles.subtitle}>
            от {data.orderDate}
            {data.orderName ? ` — ${data.orderName}` : ""}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Стороны</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Покупатель (импортёр)</Text>
            <Text style={styles.value}>{data.clientName}</Text>
          </View>
          {data.clientAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Адрес покупателя</Text>
              <Text style={styles.value}>{data.clientAddress}</Text>
            </View>
          )}
          {data.clientInn && (
            <View style={styles.row}>
              <Text style={styles.label}>ИНН покупателя</Text>
              <Text style={styles.value}>{data.clientInn}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Поставщик (фабрика)</Text>
            <Text style={styles.value}>{data.factoryName}</Text>
          </View>
          {data.factoryAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Адрес поставщика</Text>
              <Text style={styles.value}>{data.factoryAddress}</Text>
            </View>
          )}
          {data.factoryInn && (
            <View style={styles.row}>
              <Text style={styles.label}>ИНН поставщика</Text>
              <Text style={styles.value}>{data.factoryInn}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Валюта контракта</Text>
            <Text style={styles.value}>{data.factoryCurrency}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Позиции</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={styles.cellSku}>Артикул</Text>
              <Text style={styles.cellName}>Наименование</Text>
              <Text style={styles.cellSize}>Размер</Text>
              <Text style={styles.cellColor}>Цвет</Text>
              <Text style={styles.cellQty}>Кол.</Text>
              <Text style={styles.cellPrice}>Цена сом</Text>
              <Text style={styles.cellPrice}>Цена руб</Text>
              <Text style={styles.cellTotal}>Итого руб</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={styles.tr}>
                <Text style={styles.cellSku}>{item.sku}</Text>
                <Text style={styles.cellName}>{item.name}</Text>
                <Text style={styles.cellSize}>{item.sizeCode || "—"}</Text>
                <Text style={styles.cellColor}>{item.color || "—"}</Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellPrice}>{item.priceSom}</Text>
                <Text style={styles.cellPrice}>{item.priceRub}</Text>
                <Text style={styles.cellTotal}>{item.subtotalRub}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Итого в сом (KGS):</Text>
            <Text style={styles.totalsValue}>{data.totalSom}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Итого в рублях (RUB):</Text>
            <Text style={styles.totalsValue}>{data.totalRub}</Text>
          </View>
          {(data.cashbackPercent || data.cashbackAmount) && (
            <>
              {data.cashbackPercent && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Кэшбэк, %:</Text>
                  <Text style={styles.totalsValue}>{data.cashbackPercent}</Text>
                </View>
              )}
              {data.cashbackAmount && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    Кэшбэк, сумма ({data.cashbackCurrency ?? "RUB"}):
                  </Text>
                  <Text style={styles.totalsValue}>{data.cashbackAmount}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {data.comments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Комментарий</Text>
            <Text>{data.comments}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>От покупателя</Text>
            <Text style={styles.sigLine}>{data.clientName}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>От поставщика</Text>
            <Text style={styles.sigLine}>{data.factoryName}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Спецификация № ${data.orderNumber} — сгенерировано ${data.generatedAt} — стр. ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
