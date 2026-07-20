"use client";

import { useState, useTransition } from "react";
import { updateDeliveryAction } from "@/app/actions";
import type { ShippingAction, ShippingStatus } from "@/lib/types";

const actions: Record<ShippingStatus, { value: ShippingAction; label: string; tone?: string }[]> = {
  unassigned: [],
  assigned: [{ value: "accept", label: "Nhận đơn" }, { value: "reject", label: "Từ chối", tone: "danger" }],
  accepted: [{ value: "picked_up", label: "Đã lấy hàng" }, { value: "reject", label: "Từ chối", tone: "danger" }],
  picked_up: [{ value: "delivering", label: "Bắt đầu giao" }, { value: "failed", label: "Giao chưa được", tone: "danger" }],
  delivering: [{ value: "delivered", label: "Giao thành công" }, { value: "failed", label: "Giao chưa được", tone: "danger" }],
  delivered: [],
  failed: [{ value: "delivering", label: "Giao lại" }, { value: "delivered", label: "Đã giao xong" }],
};

export function ShipperDeliveryControls({ orderId, status, codExpected }: { orderId: string; status: ShippingStatus; codExpected: number }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const canDeliver = status === "delivering" || status === "failed";
  if (!actions[status].length) return null;
  return <form className="shipperActionForm" action={(data) => startTransition(async () => {
    const result = await updateDeliveryAction(data);
    setMessage(result.ok ? "Đã cập nhật đơn" : result.error);
  })}>
    <input type="hidden" name="orderId" value={orderId} />
    <label>Ghi chú<textarea name="note" placeholder="Lý do giao chưa được, lưu ý khi giao..." /></label>
    {canDeliver ? <><label>COD thực thu<input name="codCollected" type="number" min="0" step="1000" defaultValue={codExpected} /></label><label>Ảnh xác nhận giao hàng<input name="proof" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /></label></> : null}
    <div className="shipperActionButtons">{actions[status].map((item) => <button name="deliveryAction" value={item.value} className={item.tone ?? ""} disabled={pending} key={item.value}>{pending ? "Đang cập nhật..." : item.label}</button>)}</div>
    {message ? <p className={message.startsWith("Đã") ? "successBox" : "errorBox"}>{message}</p> : null}
  </form>;
}
