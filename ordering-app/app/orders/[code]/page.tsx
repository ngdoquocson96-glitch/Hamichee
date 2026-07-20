import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Banknote, CheckCircle2, MapPin, Phone, Truck } from "lucide-react";
import { reportTransferAction } from "@/app/actions";
import { orderForCustomer, requireUser } from "@/lib/data";
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS } from "@/lib/format";

export default async function OrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("/orders");
  const { code } = await params;
  const result = await orderForCustomer(code, user.id);
  if (!result) notFound();
  const { order, items, shipper, proofUrl } = result;
  const address = order.delivery_address;
  return <div className="pageStack"><div className="orderSuccess"><CheckCircle2 /><p>Mã đơn hàng</p><h1>{order.code}</h1><span className={`status ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span><small>{formatDateTime(order.created_at)}</small></div>
    <section className="panel"><h2>Món đã đặt</h2><div className="lineItems">{items.map((item) => <div key={item.id}><span>{item.quantity} × {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span><strong>{formatCurrency(item.line_total)}</strong></div>)}</div><div className="totals"><div><span>Tạm tính</span><b>{formatCurrency(order.subtotal)}</b></div><div><span>Ưu đãi hạng {order.tier_name} ({order.discount_percent}%)</span><b>-{formatCurrency(order.discount_amount)}</b></div><div><span>Phí giao hàng</span><b>{formatCurrency(order.delivery_fee)}</b></div><div><span>Tổng cộng</span><strong>{formatCurrency(order.total)}</strong></div></div></section>
    {address ? <section className="panel"><h2><MapPin size={20} /> Địa chỉ giao</h2><p><strong>{address.recipientName}</strong> · {address.phone}</p><p>{address.addressLine}, {address.ward}, {address.district}, {address.city}</p>{address.deliveryNote ? <small>{address.deliveryNote}</small> : null}</section> : null}
    {order.fulfilment_method === "delivery" ? <section className="panel"><h2><Truck size={20} /> Theo dõi giao hàng</h2><p><span className={`shippingStatus ${order.shipping_status}`}>{SHIPPING_STATUS_LABELS[order.shipping_status]}</span></p>{shipper ? <p><strong>{shipper.full_name}</strong>{shipper.phone ? <> · <a className="inlinePhone" href={`tel:${shipper.phone}`}><Phone size={15} /> Gọi shipper</a></> : null}</p> : <p className="muted">HAMICHEE đang sắp xếp người giao.</p>}{order.shipping_note ? <p className="muted">{order.shipping_note}</p> : null}{proofUrl ? <Image className="deliveryProof" src={proofUrl} width={720} height={540} alt={`Ảnh giao hàng đơn ${order.code}`} /> : null}</section> : null}
    <section className="paymentCard"><Banknote /><div><h2>Chuyển khoản VietQR</h2><p>Techcombank · CTY TNHH DACOHAMI GROUP</p><strong>STK: 21686878</strong><p>Nội dung: <b>HAMICHEE {order.code}</b></p><span>{PAYMENT_STATUS_LABELS[order.payment_status]}</span></div></section>
    <Image className="qrImage" src="/payments/techcombank-vietqr.jpg" width={1181} height={2560} alt="Mã VietQR Techcombank của CTY TNHH DACOHAMI GROUP" />
    {order.payment_status === "pending" && order.status !== "cancelled" ? <form action={reportTransferAction}><input type="hidden" name="code" value={order.code} /><button className="primaryButton full">Tôi đã chuyển khoản</button></form> : null}
    <p className="muted centerText">Khi đơn hoàn thành, m nhận {order.points_earned} điểm. Nhân viên vẫn kiểm tra giao dịch trước khi xác nhận.</p><Link href="/orders" className="outlineButton centered">Quay lại danh sách đơn</Link>
  </div>;
}
