"use client";

import { useState, useTransition } from "react";
import { assignShipperAction } from "@/app/actions";
import type { CustomerProfile } from "@/lib/types";

export function AdminDeliveryControls({ orderId, shippers, initialShipperId, initialCod }: { orderId: string; shippers: CustomerProfile[]; initialShipperId: string | null; initialCod: number }) {
  const [shipperId, setShipperId] = useState(initialShipperId ?? "");
  const [cod, setCod] = useState(initialCod);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function save() {
    const data = new FormData();
    data.set("orderId", orderId); data.set("shipperId", shipperId); data.set("codExpected", String(cod));
    startTransition(async () => {
      const result = await assignShipperAction(data);
      setMessage(result.ok ? "Đã cập nhật phân công" : result.error);
    });
  }
  return <div className="deliveryAssign">
    <label>Shipper<select value={shipperId} onChange={(event) => setShipperId(event.target.value)}><option value="">Chưa phân công</option>{shippers.map((shipper) => <option value={shipper.id} key={shipper.id}>{shipper.full_name || shipper.email}</option>)}</select></label>
    <label>COD cần thu<input type="number" min="0" step="1000" value={cod} onChange={(event) => setCod(Number(event.target.value))} /></label>
    <button type="button" onClick={save} disabled={pending || !shippers.length && !initialShipperId}>{pending ? "Đang lưu..." : "Phân giao"}</button>
    {message ? <small className={message.startsWith("Đã") ? "successText" : "errorText"}>{message}</small> : null}
  </div>;
}
