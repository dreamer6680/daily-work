import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Work",
  description: "开发工作台与任务进展管理",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
