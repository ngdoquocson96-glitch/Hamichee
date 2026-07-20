import { Banknote, MapPin, Navigation, Phone, Truck } from "lucide-react";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { ShipperDeliveryControls } from "@/components/shipper-delivery-controls";
import { ChangePasswordForm } from "@/components/change-password-form";
import { shipperDashboardData } from "@/lib/data";
import { DELIVERY_EVENT_LABELS, formatCurrency, formatDateTime, SHIPPING_STATUS_LABELS } from "@/lib/format";

export default async function ShipperPage() {
  const { profile, orders, items, events } = await shipperDashboardData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const active = orders.filter((order) => ["assigned", "accepted", "picked_up", "delivering", "failed"].includes(order.shipping_status));
  const completedToday = orders.filter((order) => order.shipping_status === "delivered" && order.delivered_at && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(order.delivered_at)) === today);
  const sorted = [...orders].sort((a, b) => Number(["delivered"].includes(a.shipping_status)) - Number(["delivered"].includes(b.shipping_status)) || +new Date(b.created_at) - +new Date(a.created_at));
  return <div className="shipperContent"><div className="shipperTitle"><div><h2>Đơn giao của tôi</h2><p>Nhận đơn, mở bản đồ và cập nhật ngay tại điểm giao.</p></div><RealtimeRefresh shipperId={profile.id} /></div>
    <div className="shipperStats"><article><Truck /><span>Đang xử lý</span><strong>{active.length}</strong></article><article><Banknote /><span>COD hôm nay</span><strong>{formatCurrency(completedToday.reduce((sum, order) => sum + Number(order.cod_collected), 0))}</strong></article></div>
    <div className="shipperOrders">{sorted.map((order) => {
      const address = order.delivery_address;
      const orderItems = items.filter((item) => item.order_id === order.id);
      const orderEvents = events.filter((event) => event.order_id === order.id).slice(0, 5);
      const addressText = address ? `${address.addressLine}, ${address.ward}, ${address.district}, ${address.city}` : "";
      return <article className={`shipperOrder ${order.shipping_status}`} key={order.id}><div className="shipperOrderTop"><div><h3>{order.code}</h3><p>{formatDateTime(order.created_at)}</p></div><span className={`shippingStatus ${order.shipping_status}`}>{SHIPPING_STATUS_LABELS[order.shipping_status]}</span></div>
        <div className="shipperCustomer"><div><strong>{address?.recipientName || order.customer_name}</strong><p>{addressText}</p>{address?.deliveryNote ? <small>Ghi chú: {address.deliveryNote}</small> : null}</div><div><a className="callButton" href={`tel:${address?.phone || order.phone}`}><Phone size={18} /> Gọi</a>{addressText ? <a className="mapButton" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`}><Navigation size={18} /> Bản đồ</a> : null}</div></div>
        <div className="shipperItems">{orderItems.map((item) => <span key={item.id}>{item.quantity} × {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span>)}</div>
        <div className="codSummary"><span>COD cần thu</span><strong>{formatCurrency(order.cod_expected)}</strong></div>
        {order.proof_image_path ? <div className="deliveredMark"><MapPin size={18} /> Đã lưu ảnh xác nhận giao hàng</div> : null}
        {orderEvents.length ? <details className="deliveryTimeline"><summary>Nhật ký gần đây</summary><div>{orderEvents.map((event) => <p key={event.id}><strong>{DELIVERY_EVENT_LABELS[event.event_type] ?? event.event_type}</strong><span>{formatDateTime(event.created_at)}</span>{event.note ? <small>{event.note}</small> : null}</p>)}</div></details> : null}
        <ShipperDeliveryControls orderId={order.id} status={order.shipping_status} codExpected={order.cod_expected} />
      </article>;
    })}{!orders.length ? <div className="emptyState"><Truck /><h1>Chưa có đơn được phân</h1><p>Đơn mới sẽ tự xuất hiện tại đây.</p></div> : null}</div>
    <details className="shipperPassword"><summary>Đổi mật khẩu đăng nhập</summary><ChangePasswordForm /></details>
  </div>;
}
