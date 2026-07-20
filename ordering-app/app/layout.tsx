import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { currentProfile } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "HAMICHEE", template: "%s | HAMICHEE" },
  description: "Đặt món, theo dõi đơn và tích điểm thành viên HAMICHEE.",
  applicationName: "HAMICHEE",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00783e" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await currentProfile().catch(() => null);
  return <html lang="vi"><body><CartProvider><div className="appFrame"><Header profile={profile} /><main className="mainContent">{children}</main><BottomNav /></div></CartProvider></body></html>;
}
