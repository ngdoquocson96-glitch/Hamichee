"use client";

import { useTransition } from "react";
import { updateTierAction } from "@/app/actions";
import type { LoyaltyTier } from "@/lib/types";

export function TierForm({ tier }: { tier: LoyaltyTier }) {
  const [pending, startTransition] = useTransition();
  return <form className="tierEdit" action={(data) => startTransition(async () => { await updateTierAction(data); })}>
    <input type="hidden" name="id" value={tier.id} />
    <label>Tên hạng <input name="name" required maxLength={40} defaultValue={tier.name} style={{ color: tier.color, fontWeight: 700 }} /></label>
    <label>Từ <input name="minPoints" type="number" min="0" defaultValue={tier.min_points} /> điểm</label>
    <label>Giảm <input name="discountPercent" type="number" min="0" max="30" step="0.5" defaultValue={tier.discount_percent} />%</label>
    <button disabled={pending}>{pending ? "..." : "Lưu"}</button>
  </form>;
}
