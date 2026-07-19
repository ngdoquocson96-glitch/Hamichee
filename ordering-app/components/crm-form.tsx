"use client";

import { useState, useTransition } from "react";
import { updateCustomerCrmAction } from "@/app/actions";

export function CrmForm({ id, notes, tags }: { id: string; notes: string; tags: string[] }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  return <form className="crmForm" action={(data) => startTransition(async () => { await updateCustomerCrmAction(data); setSaved(true); })}>
    <input type="hidden" name="id" value={id} />
    <input name="tags" defaultValue={tags.join(", ")} placeholder="VIP, thích ít ngọt..." />
    <textarea name="notes" defaultValue={notes} placeholder="Ghi chú chăm sóc khách hàng" />
    <button disabled={pending}>{pending ? "Đang lưu" : saved ? "Đã lưu" : "Lưu CRM"}</button>
  </form>;
}
