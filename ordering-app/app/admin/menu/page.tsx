import { AdminProductForm } from "@/components/admin-product-form";
import { requireAdmin } from "@/lib/data";
import type { Category, Product } from "@/lib/types";

export default async function AdminMenuPage() {
  const { admin } = await requireAdmin();
  const [{ data: categories }, { data: products }] = await Promise.all([
    admin.from("ordering_categories").select("*").order("sort_order"),
    admin.from("ordering_products").select("*").order("sort_order"),
  ]);
  return <div className="adminContent"><div className="adminTitle"><div><h2>Thực đơn</h2><p>Đổi tên, giá, trạng thái và tải ảnh món. Khách hàng nhận cập nhật realtime.</p></div></div><div className="adminProductList">{((products ?? []) as Product[]).map((product) => <AdminProductForm key={product.id} product={product} categories={(categories ?? []) as Category[]} />)}{!products?.length ? <div className="warningBox">Chưa có dữ liệu menu. Hãy chạy file migration Supabase trước.</div> : null}</div></div>;
}
