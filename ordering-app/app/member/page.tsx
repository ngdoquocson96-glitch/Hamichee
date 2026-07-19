import type { Metadata } from "next";
import Link from "next/link";
import { Award, CheckCircle2, Gift } from "lucide-react";
import { currentProfile, getTiers } from "@/lib/data";
import { tierForPoints } from "@/lib/format";

export const metadata: Metadata = { title: "Thành viên" };
export default async function MemberPage() {
  const [profile, tiers] = await Promise.all([currentProfile(), getTiers()]);
  const currentTier = profile ? tierForPoints(tiers, profile.points) : null;
  const nextTier = profile ? tiers.filter((tier) => tier.min_points > profile.points).sort((a, b) => a.min_points - b.min_points)[0] : null;
  return <div className="pageStack"><div className="memberHero"><Gift /><p>Điểm hiện có</p><strong>{profile?.points ?? 0}</strong><span>Hạng {currentTier?.name ?? "Thành viên"}</span>{nextTier ? <small>Còn {nextTier.min_points - (profile?.points ?? 0)} điểm để lên hạng {nextTier.name}</small> : null}</div>
    {!profile ? <div className="warningBox">Đăng nhập để bắt đầu tích điểm. <Link href="/auth?next=/member">Đăng nhập ngay</Link></div> : null}
    <section className="panel"><h1>Quyền lợi theo hạng</h1><p className="muted">Mỗi đơn hoàn thành: 10.000đ = 1 điểm. Giảm giá được áp dụng tự động khi đặt hàng.</p><div className="tierGrid">{tiers.map((tier) => <article key={tier.id} style={{ borderColor: tier.color }}><Award style={{ color: tier.color }} /><h2>{tier.name}</h2><strong>Từ {tier.min_points} điểm</strong><p>Giảm {tier.discount_percent}% mỗi đơn</p>{currentTier?.id === tier.id ? <span><CheckCircle2 size={15} /> Hạng hiện tại</span> : null}</article>)}</div></section>
  </div>;
}
