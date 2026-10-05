import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Shop AI · The digital waiter", description: "A menu-aware AI waiter for restaurants, in Thai, Burmese and English." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf3e4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=Courier+Prime:wght@400;700&family=Noto+Sans+Myanmar:wght@400;700&family=Noto+Sans+Thai:wght@400;700&family=Righteous&family=Yellowtail&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
