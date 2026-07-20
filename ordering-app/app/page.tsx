import Link from "next/link";
import { ArrowRight, Gift, Leaf, Sparkles } from "lucide-react";
import { ProductMedia } from "@/components/product-media";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getMenu } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function HomePage() {
  const menu = await getMenu();
  const featured = menu.flatMap((category) => category.products.map((product) => ({ ...product, categoryPosition: category.image_position }))).filter((product) => product.featured).slice(0, 6);
  return <div className="homeStack"><RealtimeRefresh />
    <section className="hero"><div className="heroOrb one" /><div className="heroOrb two" /><Sparkles className="heroSpark" /><span><Leaf size={15} /> HAMICHEE</span><h1>Nguyên liệu tinh túy – Vị nhà mát lành</h1><p>Đặt món, theo dõi đơn và nhận ưu đãi thành viên trong một nơi.</p><Link href="/menu">Xem thực đơn <ArrowRight size={17} /></Link></section>
    <section><div className="sectionTitle"><div><h2>9 nhóm món nhà Hami</h2><p>Admin cập nhật là khách hàng thấy ngay.</p></div></div><div className="categoryGrid">{menu.map((category) => <Link key={category.id} href={`/menu?category=${category.id}`}><ProductMedia name={category.name} imageUrl={null} position={category.image_position} className="categoryImage" /><strong>{category.name}</strong></Link>)}</div></section>
    <section><div className="sectionTitle"><div><h2>Bán chạy</h2><p>Những món được yêu thích tại HAMICHEE.</p></div><Link href="/menu">Xem tất cả</Link></div><div className="featuredList">{featured.map((product) => <article key={product.id}><ProductMedia name={product.name} imageUrl={product.image_url} position={product.image_position ?? product.categoryPosition} /><div><h3>{product.name}</h3><strong>{formatCurrency(product.price)}</strong></div></article>)}</div></section>
    <section className="memberBanner"><Gift /><div><h2>Thành viên HAMICHEE</h2><p>Mỗi 10.000đ nhận 1 điểm, tự động lên hạng và giảm giá khi đặt món.</p><Link href="/member">Xem quyền lợi <ArrowRight size={16} /></Link></div></section>
  </div>;
}
