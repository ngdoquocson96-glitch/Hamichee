import "./globals.css";

export const metadata = {
  title: "Hamichee Nội Bộ",
  description: "Hệ thống giao việc nội bộ Hamichee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
