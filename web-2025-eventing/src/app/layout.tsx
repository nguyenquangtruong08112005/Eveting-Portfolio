import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AuraEvents — Khám phá & Đặt vé sự kiện trực tuyến",
  description:
    "Nền tảng đặt vé sự kiện trực tuyến với chọn ghế tương tác thời gian thực, thanh toán an toàn qua ZaloPay, và phát hành vé tức thì.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
