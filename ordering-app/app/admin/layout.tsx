import Link from "next/link";
import { BarChart3, ClipboardList, LogOut, Soup, Users } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return <div className="adminShell"><header className="adminHeader"><div><span>HAMICHEE</span><h1>Quản trị đặt hàng</h1><p>{profile.full_name}</p></div><SignOutButton /></header><nav className="adminNav"><Link href="/admin"><BarChart3 /> Tổng quan</Link><Link href="/admin/orders"><ClipboardList /> Đơn hàng</Link><Link href="/admin/menu"><Soup /> Thực đơn</Link><Link href="/admin/customers"><Users /> Khách hàng & CRM</Link><Link href="/"><LogOut /> Về app khách</Link></nav>{children}</div>;
}
