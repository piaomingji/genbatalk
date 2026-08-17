import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://genbatalk.vercel.app"),
  title: "Talkie - Real-time voice translation",
  description: "Real-time voice translation between any two languages. Speak naturally and be understood, in 17 languages.",
  openGraph: {
    title: "Talkie - Real-time voice translation",
    description: "Real-time voice translation between any two languages. Speak naturally and be understood, in 17 languages.",
    url: "https://genbatalk.vercel.app",
    siteName: "Talkie",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Talkie App Icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Talkie - Real-time voice translation",
    description: "Real-time voice translation between any two languages. Speak naturally and be understood, in 17 languages.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 font-sans text-slate-100">
        {children}
      </body>
    </html>
  );
}
