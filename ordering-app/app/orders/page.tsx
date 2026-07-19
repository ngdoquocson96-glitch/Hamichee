import type { Metadata } from "next";
import Link from "next/link";
import { customerDashboardData, requireUser } from "@/lib/data";
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Đơn của tôi" };
export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const { orders } = await customerDashboardData(user.id);
  return <div className="pageStack"><div className="pageHeading"><h1>Đơn của tôi</h1><p>Theo dõi xác nhận, chuẩn bị, giao hàng và tích điểm.</p></div><div className="orderCards">{orders.map((order) => <Link href={`/orders/${order.code}`} key={order.id}><div><strong>{order.code}</strong><span className={`status ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span></div><p>{formatDateTime(order.created_at)}</p><b>{formatCurrency(order.total)}</b></Link>)}{!orders.length ? <div className="emptyState"><p>Chưa có đơn hàng.</p><Link href="/menu" className="primaryButton">Đặt món đầu tiên</Link></div> : null}</div></div>;
}
