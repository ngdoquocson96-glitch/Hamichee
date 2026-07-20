import { Truck } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { requireShipper } from "@/lib/data";

export default async function ShipperLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireShipper();
  return <div className="shipperShell"><header className="shipperHeader"><div><span><Truck size={18} /> HAMICHEE GIAO HÀNG</span><h1>{profile.full_name}</h1><a href={`tel:${profile.phone}`}>{profile.phone}</a></div><SignOutButton /></header>{children}</div>;
}
