import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ゲンバトーク (GenbaTalk) - 現場専用AI同時通訳",
  description: "建設現場・工場・倉庫で働く外国人労働者企業向けの、トランシーバー型リアルタイム音声通訳アプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 font-sans text-slate-100">
        {children}
      </body>
    </html>
  );
}
