"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseBrowserClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("Email hoặc mật khẩu chưa đúng.");
      else {
        let target = searchParams.get("next");
        if (!target) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = user ? await supabase.from("ordering_profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
          target = profile?.role === "admin" ? "/admin" : profile?.role === "shipper" ? "/shipper" : "/profile";
        }
        router.replace(target); router.refresh();
      }
    } else {
      const fullName = String(form.get("fullName") ?? "").trim();
      const phone = String(form.get("phone") ?? "").trim();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Đã tạo tài khoản. Hãy mở email để xác nhận rồi đăng nhập.");
      else { router.replace(searchParams.get("next") || "/profile"); router.refresh(); }
    }
    setLoading(false);
  }

  return <div className="authCard">
    <div className="authTabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Đăng nhập</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Tạo tài khoản</button></div>
    <form onSubmit={submit} className="formStack">
      {mode === "signup" ? <><label>Họ và tên<input name="fullName" required maxLength={120} /></label><label>Số điện thoại<input name="phone" required inputMode="tel" placeholder="0901 234 567" /></label></> : null}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Mật khẩu<input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      <button className="primaryButton" disabled={loading}>{loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
      {message ? <p className="formMessage">{message}</p> : null}
    </form>
  </div>;
}
