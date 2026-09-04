import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaceGate AI — Hệ Thống Kiểm Soát An Toàn",
  description: "Hệ thống kiểm soát ra vào thông minh sử dụng AI nhận diện khuôn mặt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
