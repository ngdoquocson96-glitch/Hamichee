"use client";

import { useState, useTransition } from "react";
import { updateOrderAction } from "@/app/actions";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export function AdminOrderControls({ id, initialStatus, initialPayment }: { id: string; initialStatus: OrderStatus; initialPayment: PaymentStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPayment);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  function save() {
    const data = new FormData(); data.set("id", id); data.set("status", status); data.set("paymentStatus", paymentStatus);
    startTransition(async () => { await updateOrderAction(data); setSaved(true); window.setTimeout(() => setSaved(false), 1200); });
  }
  return <div className="orderControls">
    <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>{Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>{Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <button onClick={save} disabled={pending}>{pending ? "Đang lưu" : saved ? "Đã lưu" : "Cập nhật"}</button>
  </div>;
}
