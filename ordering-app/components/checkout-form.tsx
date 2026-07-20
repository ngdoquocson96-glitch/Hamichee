"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Store } from "lucide-react";
import { createOrderAction } from "@/app/actions";
import { useCart } from "./cart-provider";
import { formatCurrency } from "@/lib/format";
import type { CustomerAddress, LoyaltyTier } from "@/lib/types";

export function CheckoutForm({ addresses, tier }: { addresses: CustomerAddress[]; tier: LoyaltyTier | null }) {
  const { items, total, clear, ready } = useCart();
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [addressId, setAddressId] = useState(addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const discount = Math.floor(total * Number(tier?.discount_percent ?? 0) / 100);
  const deliveryFee = method === "delivery" ? 15_000 : 0;

  if (!ready) return <div className="emptyState">Đang chuẩn bị trang đặt hàng...</div>;
  if (!items.length) return <div className="emptyState"><h1>Giỏ hàng đang trống</h1><Link href="/menu" className="primaryButton">Chọn món</Link></div>;

  function submit() {
    setMessage("");
    startTransition(async () => {
      const result = await createOrderAction({ items, fulfilmentMethod: method, addressId, note });
      if (!result.ok) setMessage(result.error);
      else { clear(); router.push(`/orders/${result.code}`); router.refresh(); }
    });
  }

  return <div className="pageStack">
    <div className="pageHeading"><h1>Xác nhận đặt hàng</h1><p>Đăng nhập giúp lưu địa chỉ, theo dõi đơn và tích điểm.</p></div>
    <section className="panel"><h2>Hình thức nhận món</h2><div className="choiceGrid">
      <button className={method === "delivery" ? "active" : ""} onClick={() => setMethod("delivery")}><MapPin /> Giao tận nơi</button>
      <button className={method === "pickup" ? "active" : ""} onClick={() => setMethod("pickup")}><Store /> Nhận tại cửa hàng</button>
    </div></section>
    {method === "delivery" ? <section className="panel"><div className="panelHeader"><h2>Địa chỉ nhận hàng</h2><Link href="/profile">Quản lý địa chỉ</Link></div>
      {addresses.length ? <div className="addressChoices">{addresses.map((address) => <label key={address.id} className={addressId === address.id ? "selected" : ""}><input type="radio" name="address" value={address.id} checked={addressId === address.id} onChange={() => setAddressId(address.id)} /><strong>{address.label}</strong><span>{address.recipient_name} · {address.phone}</span><p>{address.address_line}, {address.ward}, {address.district}, {address.city}</p></label>)}</div> : <div className="warningBox">M chưa có địa chỉ nhận hàng. <Link href="/profile">Thêm địa chỉ ngay</Link>.</div>}
    </section> : null}
    <section className="panel"><h2>Ghi chú đơn hàng</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Ít đá, giao giờ nào..." /></section>
    <section className="orderSummary">
      <div><span>Tạm tính</span><strong>{formatCurrency(total)}</strong></div>
      <div><span>Ưu đãi hạng {tier?.name ?? "Thành viên"} ({tier?.discount_percent ?? 0}%)</span><strong>-{formatCurrency(discount)}</strong></div>
      <div><span>Phí giao hàng</span><strong>{formatCurrency(deliveryFee)}</strong></div>
      <div className="grandTotal"><span>Tổng thanh toán</span><strong>{formatCurrency(total - discount + deliveryFee)}</strong></div>
      <p>Đơn hoàn thành được cộng {Math.floor((total - discount + deliveryFee) / 10_000)} điểm.</p>
      {message ? <p className="errorBox">{message}</p> : null}
      <button className="primaryButton full" onClick={submit} disabled={pending || (method === "delivery" && !addressId)}>{pending ? "Đang tạo đơn..." : "Đặt hàng và xem VietQR"}</button>
    </section>
  </div>;
}
