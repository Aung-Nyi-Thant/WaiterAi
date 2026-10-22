import "./globals.css";
import type { Metadata, Viewport } from "next";
import WaterFx from "@/modules/platform/WaterFx";

export const metadata: Metadata = { title: "Shop AI · The digital waiter", description: "A menu-aware AI waiter for restaurants, in Thai, Burmese and English." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f5f5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Noto+Sans+Myanmar:wght@400;600;700&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}<WaterFx /></body>
    </html>
  );
}
