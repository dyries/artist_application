import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artist Application Studio",
  description: "Local artist residency and exhibition application assistant"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
