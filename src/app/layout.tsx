import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPACE COMMANDER — Operation Moonlight",
  description:
    "An interactive lunar-base mission trainer for kids 9–12, powered by NASA LOLA south-pole illumination data. NASA Space Apps Challenge 2026 — Team SUHAIL.",
};

export const viewport: Viewport = { themeColor: "#0b1026", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <div className="stars" aria-hidden />
        {children}
      </body>
    </html>
  );
}
