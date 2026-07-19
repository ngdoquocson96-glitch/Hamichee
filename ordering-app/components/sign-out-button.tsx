"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  return <button className="outlineButton" onClick={async () => { await getSupabaseBrowserClient().auth.signOut(); router.replace("/"); router.refresh(); }}><LogOut size={17} /> Đăng xuất</button>;
}
