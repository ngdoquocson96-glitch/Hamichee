import { CreateShipperForm } from "@/components/create-shipper-form";
import { ShipperRoleForm } from "@/components/shipper-role-form";
import { adminShipperData } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function AdminShippersPage() {
  const { profiles, orders } = await adminShipperData();
  const shippers = profiles.filter((profile) => profile.role === "shipper");
  return <div className="adminContent"><div className="adminTitle"><div><h2>Đội giao hàng</h2><p>Tạo tài khoản, cấp quyền và theo dõi đơn/COD của shipper.</p></div></div>
    <section className="adminPanel"><h2>Tạo tài khoản shipper</h2><p className="muted">Dùng email riêng của nhân viên và giao mật khẩu ban đầu trực tiếp cho họ.</p><CreateShipperForm /></section>
    <section className="adminPanel"><h2>Hiệu suất shipper</h2><div className="shipperStatsList">{shippers.map((shipper) => {
      const assigned = orders.filter((order) => order.shipper_id === shipper.id);
      const delivered = assigned.filter((order) => order.shipping_status === "delivered");
      const active = assigned.filter((order) => ["assigned", "accepted", "picked_up", "delivering", "failed"].includes(order.shipping_status)).length;
      return <article key={shipper.id}><div><strong>{shipper.full_name || shipper.email}</strong><a href={`tel:${shipper.phone}`}>{shipper.phone || "Chưa có SĐT"}</a></div><span><b>{active}</b> đang giao</span><span><b>{delivered.length}</b> hoàn tất</span><span><b>{formatCurrency(delivered.reduce((sum, order) => sum + Number(order.cod_collected ?? 0), 0))}</b> COD</span></article>;
    })}{!shippers.length ? <p className="muted">Chưa có tài khoản shipper.</p> : null}</div></section>
    <section className="adminPanel"><h2>Phân quyền tài khoản</h2><p className="muted">Có thể chuyển tài khoản đã đăng ký thành shipper. Không thể hạ quyền khi còn đơn đang giao.</p><div className="staffList">{profiles.map((profile) => <article key={profile.id}><div><strong>{profile.full_name || profile.email}</strong><small>{profile.email} · {profile.phone || "Chưa có SĐT"}</small></div><ShipperRoleForm profile={profile} /></article>)}</div></section>
  </div>;
}
