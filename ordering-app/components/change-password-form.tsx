"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8 || password !== confirm) { setMessage("Mật khẩu phải từ 8 ký tự và hai ô phải giống nhau"); setLoading(false); return; }
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setMessage(error ? error.message : "Đã đổi mật khẩu");
    if (!error) event.currentTarget.reset();
    setLoading(false);
  }
  return <form className="formStack" onSubmit={submit}><label>Mật khẩu mới<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Nhập lại mật khẩu<input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label><button className="primaryButton" disabled={loading}>{loading ? "Đang lưu..." : "Đổi mật khẩu"}</button>{message ? <p className={message.startsWith("Đã") ? "successBox" : "errorBox"}>{message}</p> : null}</form>;
}
