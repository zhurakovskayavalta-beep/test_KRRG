import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Import ERP",
  description: "Система управления импортными заказами",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
