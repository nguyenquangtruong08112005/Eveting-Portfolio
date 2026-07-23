import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale } from 'next-intl/server';
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eventing — Khám phá & Đặt vé sự kiện trực tuyến",
  description:
    "Nền tảng đặt vé sự kiện trực tuyến với chọn ghế tương tác thời gian thực, thanh toán an toàn qua ZaloPay, và phát hành vé tức thì.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
