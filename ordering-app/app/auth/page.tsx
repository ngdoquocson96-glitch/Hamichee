import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/data";

export const metadata: Metadata = { title: "Đăng nhập" };
export default async function AuthPage() {
  if (await currentUser()) redirect("/profile");
  return <div className="authPage"><div className="pageHeading centerText"><h1>Thành viên HAMICHEE</h1><p>Tạo tài khoản để theo dõi đơn, lưu địa chỉ và tích điểm.</p></div><Suspense fallback={<p>Đang tải...</p>}><AuthForm /></Suspense></div>;
}
