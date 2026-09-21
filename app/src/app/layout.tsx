import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Shop AI · The digital waiter", description: "A menu-aware AI waiter for restaurants, in Thai, Burmese and English." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1030" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Myanmar:wght@400;600&family=Noto+Sans+Thai:wght@400;600&family=Outfit:wght@300;400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
