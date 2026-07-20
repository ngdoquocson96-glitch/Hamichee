import Image from "next/image";
import Link from "next/link";
import { MapPin, PackageCheck, Truck } from "lucide-react";
import { AdminDeliveryControls } from "@/components/admin-delivery-controls";
import { AdminOrderControls } from "@/components/admin-order-controls";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { adminDashboardData, requireAdmin } from "@/lib/data";
import { DELIVERY_EVENT_LABELS, formatCurrency, formatDateTime, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS } from "@/lib/format";

export default async function AdminOrdersPage() {
  const [{ orders, orderItems, shippers, deliveryEvents }, { admin }] = await Promise.all([adminDashboardData(), requireAdmin()]);
  const proofEntries = await Promise.all(orders.filter((order) => order.proof_image_path).map(async (order) => {
    const { data } = await admin.storage.from("ordering-delivery-proof").createSignedUrl(order.proof_image_path!, 3600);
    return [order.id, data?.signedUrl ?? ""] as const;
  }));
  const proofUrls = new Map(proofEntries);
  return <div className="adminContent"><div className="adminTitle"><div><h2>Quản lý đơn hàng</h2><p>Xác nhận, phân shipper, theo dõi giao hàng và đối soát COD.</p></div><RealtimeRefresh admin /></div>
    {!shippers.length ? <div className="warningBox">Chưa có tài khoản shipper. <Link href="/admin/shippers">Tạo shipper trước khi phân đơn.</Link></div> : null}
    <div className="adminOrderList">{orders.map((order) => {
      const address = order.delivery_address;
      const items = orderItems.filter((item) => item.order_id === order.id);
      const shipper = shippers.find((item) => item.id === order.shipper_id);
      const proofUrl = proofUrls.get(order.id);
      const events = deliveryEvents.filter((event) => event.order_id === order.id);
      return <article key={order.id} className="adminOrderCard"><div className="orderCardTop"><div><h3>{order.code}</h3><p>{formatDateTime(order.created_at)}</p></div><div><span className={`status ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span><span className="paymentStatus">{PAYMENT_STATUS_LABELS[order.payment_status]}</span></div></div>
        <div className="customerInfo"><strong>{order.customer_name}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></div>
        <div className="adminOrderItems">{items.map((item) => <div key={item.id}><span>{item.quantity} × {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span><b>{formatCurrency(item.line_total)}</b></div>)}</div>
        {address ? <div className="addressBox"><MapPin size={19} /><div><strong>{address.recipientName} · {address.phone}</strong><p>{address.addressLine}, {address.ward}, {address.district}, {address.city}</p>{address.deliveryNote ? <small>Ghi chú: {address.deliveryNote}</small> : null}</div></div> : <div className="addressBox"><PackageCheck size={19} /><span>Khách nhận tại cửa hàng</span></div>}
        <div className="orderMoney"><span>Hạng {order.tier_name} · Giảm {order.discount_percent}%</span><strong>{formatCurrency(order.total)}</strong></div>{order.note ? <p className="orderNote">Ghi chú đơn: {order.note}</p> : null}
        {order.fulfilment_method === "delivery" ? <section className="adminDeliveryBox"><div className="deliveryHeading"><Truck size={18} /><div><strong>{shipper?.full_name || "Chưa phân shipper"}</strong><span className={`shippingStatus ${order.shipping_status}`}>{SHIPPING_STATUS_LABELS[order.shipping_status]}</span></div></div><div className="deliveryMoney"><span>COD cần thu: <b>{formatCurrency(order.cod_expected)}</b></span><span>Đã thu: <b>{formatCurrency(order.cod_collected)}</b></span></div>{order.shipping_note ? <p>{order.shipping_note}</p> : null}{proofUrl ? <Image className="deliveryProof" src={proofUrl} width={720} height={540} alt={`Ảnh xác nhận giao đơn ${order.code}`} /> : null}{events.length ? <details className="deliveryTimeline"><summary>Nhật ký giao hàng ({events.length})</summary><div>{events.map((event) => <p key={event.id}><strong>{DELIVERY_EVENT_LABELS[event.event_type] ?? event.event_type}</strong><span>{formatDateTime(event.created_at)}</span>{event.note ? <small>{event.note}</small> : null}</p>)}</div></details> : null}<AdminDeliveryControls orderId={order.id} shippers={shippers} initialShipperId={order.shipper_id} initialCod={order.cod_expected} /></section> : null}
        <AdminOrderControls id={order.id} initialStatus={order.status} initialPayment={order.payment_status} />
      </article>;
    })}{!orders.length ? <p className="emptyState">Chưa có đơn hàng.</p> : null}</div>
  </div>;
}
