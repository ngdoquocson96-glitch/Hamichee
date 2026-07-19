import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { customerDashboardData, getTiers, requireUser } from "@/lib/data";
import { tierForPoints } from "@/lib/format";

export const metadata: Metadata = { title: "Đặt hàng" };
export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const [data, tiers] = await Promise.all([customerDashboardData(user.id), getTiers()]);
  return <CheckoutForm addresses={data.addresses} tier={tierForPoints(tiers, data.profile.points)} />;
}
