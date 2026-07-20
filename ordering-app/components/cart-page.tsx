"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatCurrency } from "@/lib/format";

export function CartPage() {
  const { items, total, ready, setQuantity } = useCart();
  if (!ready) return <div className="emptyState">Đang tải giỏ hàng...</div>;
  if (!items.length) return <div className="emptyState"><ShoppingBag size={48} /><h1>Giỏ hàng đang trống</h1><p>Chọn món ngon rồi quay lại đây nhé.</p><Link className="primaryButton" href="/menu">Xem thực đơn</Link></div>;
  return <div className="pageStack">
    <div className="pageHeading"><h1>Giỏ hàng</h1><p>Kiểm tra món trước khi đặt.</p></div>
    <section className="cartList">
      {items.map((item) => <article key={`${item.productId}-${item.variantLabel ?? ""}`} className="cartItem">
        <div><h2>{item.name}</h2>{item.variantLabel ? <p>{item.variantLabel}</p> : null}<strong>{formatCurrency(item.unitPrice)}</strong></div>
        <div className="quantity"><button onClick={() => setQuantity(item.productId, item.variantLabel, item.quantity - 1)}>{item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}</button><span>{item.quantity}</span><button onClick={() => setQuantity(item.productId, item.variantLabel, item.quantity + 1)}><Plus size={16} /></button></div>
      </article>)}
    </section>
    <section className="orderSummary"><div><span>Tạm tính</span><strong>{formatCurrency(total)}</strong></div><p>Phí giao hàng và ưu đãi thành viên được tính ở bước tiếp theo.</p><Link className="primaryButton full" href="/checkout">Tiếp tục đặt hàng</Link></section>
  </div>;
}
