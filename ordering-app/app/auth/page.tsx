import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Đăng nhập" };
export default async function AuthPage() {
  const profile = await currentProfile();
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "shipper") redirect("/shipper");
  if (profile) redirect("/profile");
  return <div className="authPage"><div className="pageHeading centerText"><h1>Thành viên HAMICHEE</h1><p>Tạo tài khoản để theo dõi đơn, lưu địa chỉ và tích điểm.</p></div><Suspense fallback={<p>Đang tải...</p>}><AuthForm /></Suspense></div>;
}
