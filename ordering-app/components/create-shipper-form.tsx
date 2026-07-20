"use client";

import { useRef, useState, useTransition } from "react";
import { createShipperAction } from "@/app/actions";

export function CreateShipperForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <form ref={formRef} className="formStack" action={(data) => startTransition(async () => {
    const result = await createShipperAction(data);
    setMessage(result.ok ? "Đã tạo tài khoản shipper" : result.error);
    if (result.ok) formRef.current?.reset();
  })}>
    <div className="fieldRow"><label>Họ tên<input name="fullName" required maxLength={120} /></label><label>Số điện thoại<input name="phone" required inputMode="tel" /></label></div>
    <label>Email đăng nhập<input name="email" type="email" required /></label>
    <label>Mật khẩu ban đầu<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
    <button className="primaryButton" disabled={pending}>{pending ? "Đang tạo..." : "Tạo tài khoản shipper"}</button>
    {message ? <p className={message.startsWith("Đã") ? "successBox" : "errorBox"}>{message}</p> : null}
  </form>;
}
