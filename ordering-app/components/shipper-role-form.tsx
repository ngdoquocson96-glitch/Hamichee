"use client";

import { useState, useTransition } from "react";
import { updateUserRoleAction } from "@/app/actions";
import type { CustomerProfile, UserRole } from "@/lib/types";

export function ShipperRoleForm({ profile }: { profile: CustomerProfile }) {
  const [role, setRole] = useState<UserRole>(profile.role);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="staffRole"><select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="customer">Khách hàng</option><option value="shipper">Shipper</option></select><button type="button" disabled={pending || role === profile.role} onClick={() => {
    const data = new FormData(); data.set("id", profile.id); data.set("role", role);
    startTransition(async () => { const result = await updateUserRoleAction(data); setMessage(result.ok ? "Đã lưu" : result.error); });
  }}>{pending ? "..." : "Lưu"}</button>{message ? <small>{message}</small> : null}</div>;
}
