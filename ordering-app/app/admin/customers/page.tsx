import { CrmForm } from "@/components/crm-form";
import { TierForm } from "@/components/tier-form";
import { adminDashboardData, getTiers, requireAdmin } from "@/lib/data";
import { formatCurrency, formatDateTime, tierForPoints } from "@/lib/format";
import type { CustomerAddress } from "@/lib/types";

export default async function AdminCustomersPage() {
  const [{ customers, orders }, tiers, { admin }] = await Promise.all([adminDashboardData(), getTiers(), requireAdmin()]);
  const { data: addresses } = await admin.from("ordering_addresses").select("*").order("is_default", { ascending: false });
  return <div className="adminContent"><div className="adminTitle"><div><h2>Khách hàng & CRM</h2><p>Lưu địa chỉ, lịch sử mua, điểm, hạng, thẻ chăm sóc và ghi chú.</p></div></div><section className="adminPanel"><h2>Cấu hình hạng và giảm giá</h2><p className="muted">Admin có thể đổi ngưỡng điểm và phần trăm; đơn mới sẽ tự áp dụng.</p><div className="tierEditGrid">{tiers.map((tier) => <TierForm key={tier.id} tier={tier} />)}</div></section><div className="customerCrmList">{customers.map((customer) => {
    const customerOrders = orders.filter((order) => order.customer_id === customer.id);
    const completed = customerOrders.filter((order) => order.status === "completed");
    const spent = completed.reduce((sum, order) => sum + order.total, 0);
    const lastOrder = customerOrders[0];
    const address = ((addresses ?? []) as CustomerAddress[]).find((item) => item.customer_id === customer.id);
    const tier = tierForPoints(tiers, customer.points);
    return <article key={customer.id} className="crmCard"><div className="crmTop"><div><h3>{customer.full_name || customer.email}</h3><a href={`tel:${customer.phone}`}>{customer.phone || "Chưa có SĐT"}</a><p>{customer.email}</p></div><span style={{ background: tier?.color }}>{tier?.name ?? "Thành viên"} · {customer.points} điểm</span></div>{address ? <p className="crmAddress">{address.address_line}, {address.ward}, {address.district}, {address.city}</p> : <p className="muted">Chưa lưu địa chỉ</p>}<div className="crmMetrics"><span><b>{customerOrders.length}</b> đơn</span><span><b>{formatCurrency(spent)}</b> đã mua</span><span><b>{lastOrder ? formatDateTime(lastOrder.created_at) : "—"}</b> đơn gần nhất</span></div><CrmForm id={customer.id} notes={customer.crm_notes ?? ""} tags={customer.tags ?? []} /></article>;
  })}{!customers.length ? <p className="emptyState">Chưa có khách hàng đăng ký.</p> : null}</div></div>;
}
