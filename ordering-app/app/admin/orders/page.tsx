import { MapPin, PackageCheck } from "lucide-react";
import { AdminOrderControls } from "@/components/admin-order-controls";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { adminDashboardData } from "@/lib/data";
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

export default async function AdminOrdersPage() {
  const { orders, orderItems } = await adminDashboardData();
  return <div className="adminContent"><div className="adminTitle"><div><h2>Quản lý đơn hàng</h2><p>Xác nhận, hủy, cập nhật thanh toán và xem địa chỉ khách.</p></div><RealtimeRefresh admin /></div><div className="adminOrderList">{orders.map((order) => {
    const address = order.delivery_address;
    const items = orderItems.filter((item) => item.order_id === order.id);
    return <article key={order.id} className="adminOrderCard"><div className="orderCardTop"><div><h3>{order.code}</h3><p>{formatDateTime(order.created_at)}</p></div><div><span className={`status ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span><span className="paymentStatus">{PAYMENT_STATUS_LABELS[order.payment_status]}</span></div></div><div className="customerInfo"><strong>{order.customer_name}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></div><div className="adminOrderItems">{items.map((item) => <div key={item.id}><span>{item.quantity} × {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span><b>{formatCurrency(item.line_total)}</b></div>)}</div>{address ? <div className="addressBox"><MapPin size={19} /><div><strong>{address.recipientName} · {address.phone}</strong><p>{address.addressLine}, {address.ward}, {address.district}, {address.city}</p>{address.deliveryNote ? <small>Ghi chú: {address.deliveryNote}</small> : null}</div></div> : <div className="addressBox"><PackageCheck size={19} /><span>Khách nhận tại cửa hàng</span></div>}<div className="orderMoney"><span>Hạng {order.tier_name} · Giảm {order.discount_percent}%</span><strong>{formatCurrency(order.total)}</strong></div>{order.note ? <p className="orderNote">Ghi chú đơn: {order.note}</p> : null}<AdminOrderControls id={order.id} initialStatus={order.status} initialPayment={order.payment_status} /></article>;
  })}{!orders.length ? <p className="emptyState">Chưa có đơn hàng.</p> : null}</div></div>;
}
