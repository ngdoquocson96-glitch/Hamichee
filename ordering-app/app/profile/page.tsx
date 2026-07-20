import type { Metadata } from "next";
import Link from "next/link";
import { Bell, MapPin, ReceiptText, UserRound } from "lucide-react";
import { deleteAddressAction, markNotificationsReadAction, saveAddressAction, updateProfileAction } from "@/app/actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SignOutButton } from "@/components/sign-out-button";
import { customerDashboardData, requireUser } from "@/lib/data";
import { formatDateTime, ORDER_STATUS_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Cá nhân" };
export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const data = await customerDashboardData(user.id);
  return <div className="pageStack"><RealtimeRefresh customerId={user.id} />
    <div className="profileTop"><div className="avatar"><UserRound /></div><div><h1>{data.profile.full_name || "Thành viên HAMICHEE"}</h1><p>{data.profile.email}</p><strong>{data.profile.points} điểm</strong></div><SignOutButton /></div>
    <section className="panel"><h2>Thông tin khách hàng</h2><form action={updateProfileAction} className="formStack"><label>Họ và tên<input name="fullName" defaultValue={data.profile.full_name} required /></label><label>Số điện thoại<input name="phone" defaultValue={data.profile.phone} required /></label><button className="primaryButton">Lưu thông tin</button></form></section>
    <section className="panel"><div className="panelHeader"><h2><MapPin size={20} /> Địa chỉ nhận hàng</h2></div><div className="savedAddresses">{data.addresses.map((address) => <article key={address.id}><strong>{address.label}{address.is_default ? " · Mặc định" : ""}</strong><span>{address.recipient_name} · {address.phone}</span><p>{address.address_line}, {address.ward}, {address.district}, {address.city}</p><form action={deleteAddressAction}><input type="hidden" name="id" value={address.id} /><button>Xóa</button></form></article>)}</div>
      <details className="addressForm"><summary>+ Thêm địa chỉ mới</summary><form action={saveAddressAction} className="formStack"><input name="label" placeholder="Nhà, Công ty..." /><input name="recipientName" defaultValue={data.profile.full_name} placeholder="Người nhận" required /><input name="phone" defaultValue={data.profile.phone} placeholder="Số điện thoại" required /><input name="addressLine" placeholder="Số nhà, tên đường" required /><div className="fieldRow"><input name="ward" placeholder="Phường/Xã" required /><input name="district" placeholder="Quận/Huyện" required /></div><input name="city" placeholder="Tỉnh/Thành phố" required /><input name="deliveryNote" placeholder="Ghi chú giao hàng" /><label className="checkboxLabel"><input name="isDefault" type="checkbox" /> Đặt làm địa chỉ mặc định</label><button className="primaryButton">Lưu địa chỉ</button></form></details>
    </section>
    <section className="panel"><div className="panelHeader"><h2><ReceiptText size={20} /> Đơn gần đây</h2><Link href="/orders">Xem tất cả</Link></div><div className="compactList">{data.orders.slice(0, 5).map((order) => <Link href={`/orders/${order.code}`} key={order.id}><strong>{order.code}</strong><span>{ORDER_STATUS_LABELS[order.status]}</span><small>{formatDateTime(order.created_at)}</small></Link>)}{!data.orders.length ? <p className="muted">Chưa có đơn hàng.</p> : null}</div></section>
    <section className="panel"><div className="panelHeader"><h2><Bell size={20} /> Thông báo</h2>{data.notifications.some((item) => !item.read_at) ? <form action={markNotificationsReadAction}><button>Đánh dấu đã đọc</button></form> : null}</div><div className="notificationList">{data.notifications.map((item) => <article key={item.id} className={item.read_at ? "" : "unread"}><strong>{item.title}</strong><p>{item.message}</p><small>{formatDateTime(item.created_at)}</small></article>)}{!data.notifications.length ? <p className="muted">Chưa có thông báo.</p> : null}</div></section>
  </div>;
}
