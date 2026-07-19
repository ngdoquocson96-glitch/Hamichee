import { CircleDollarSign, Clock3, ShoppingBag, Users } from "lucide-react";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { adminDashboardData } from "@/lib/data";
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS } from "@/lib/format";

export default async function AdminPage() {
  const data = await adminDashboardData();
  const pending = data.orders.filter((order) => order.status === "pending_confirmation").length;
  return <div className="adminContent"><div className="adminTitle"><div><h2>Tổng quan hôm nay</h2><p>Dữ liệu dùng chung với app khách hàng.</p></div><RealtimeRefresh admin /></div><section className="adminStats"><article><ShoppingBag /><span>Đơn hôm nay</span><strong>{data.todayOrders}</strong></article><article><Clock3 /><span>Chờ xác nhận</span><strong>{pending}</strong></article><article><CircleDollarSign /><span>Doanh thu hoàn thành</span><strong>{formatCurrency(data.todayRevenue)}</strong></article><article><Users /><span>Khách hàng</span><strong>{data.customers.length}</strong></article></section><section className="adminPanel"><h2>Đơn mới nhất</h2><div className="adminTable"><div className="tableHead"><span>Mã đơn</span><span>Khách</span><span>Trạng thái</span><span>Tổng</span></div>{data.orders.slice(0, 10).map((order) => <div className="tableRow" key={order.id}><span><strong>{order.code}</strong><small>{formatDateTime(order.created_at)}</small></span><span>{order.customer_name}<small>{order.phone}</small></span><span className={`status ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span><strong>{formatCurrency(order.total)}</strong></div>)}</div></section></div>;
}
