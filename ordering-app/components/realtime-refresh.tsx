"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RealtimeRefresh({ customerId, shipperId, admin = false }: { customerId?: string; shipperId?: string; admin?: boolean }) {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(admin ? "admin-ordering-live" : shipperId ? `shipper-ordering-${shipperId}` : `customer-ordering-${customerId}`);
    if (admin) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "ordering_orders" }, (payload: { new: Record<string, unknown> }) => {
        setMessage(`Có đơn mới ${(payload.new as { code?: string }).code ?? ""}`);
        if (soundEnabled) {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.18, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.65);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.65);
        }
        router.refresh();
      });
    } else if (shipperId) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "ordering_orders", filter: `shipper_id=eq.${shipperId}` }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new as { code?: string };
        setMessage(`Đơn ${row.code ?? "giao hàng"} vừa được cập nhật`);
        if (Notification.permission === "granted") new Notification("HAMICHEE Giao hàng", { body: `Đơn ${row.code ?? "mới"} vừa được phân hoặc cập nhật.` });
        router.refresh();
      });
    } else if (customerId) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "ordering_orders", filter: `customer_id=eq.${customerId}` }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new as { code?: string };
        setMessage(`Đơn ${row.code ?? "của bạn"} vừa được cập nhật`);
        if (Notification.permission === "granted") new Notification("HAMICHEE", { body: `Đơn ${row.code ?? "của bạn"} vừa được cập nhật.` });
        router.refresh();
      });
    } else {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "ordering_products" }, () => router.refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "ordering_categories" }, () => router.refresh());
    }
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [admin, customerId, router, shipperId, soundEnabled]);

  if (admin) return <div className="liveControls">
    <button type="button" className={soundEnabled ? "enabled" : ""} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? <BellRing size={18} /> : <Bell size={18} />}{soundEnabled ? "Âm báo đang bật" : "Bật âm báo đơn mới"}</button>
    {message ? <span className="liveMessage">{message}</span> : null}
  </div>;

  if (customerId || shipperId) return <div className="notificationControls">
    <button type="button" onClick={async () => { if ("Notification" in window) await Notification.requestPermission(); }}><Bell size={17} /> Bật thông báo trên máy</button>
    {message ? <span>{message}</span> : null}
  </div>;
  return null;
}
