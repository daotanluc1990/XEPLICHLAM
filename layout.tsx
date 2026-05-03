import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cơm Tấm Làng - App sắp lịch",
  description: "Web app sắp lịch làm việc cho cửa hàng F&B"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
