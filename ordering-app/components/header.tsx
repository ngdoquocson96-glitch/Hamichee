import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Truck } from "lucide-react";
import type { CustomerProfile } from "@/lib/types";

export function Header({ profile }: { profile: CustomerProfile | null }) {
  return <header className="siteHeader">
    <Link href="/" className="brand" aria-label="HAMICHEE">
      <Image src="/brand/hamichee-logo.jpg" alt="HAMICHEE" width={170} height={66} priority />
    </Link>
    {profile?.role === "admin" ? <Link href="/admin" className="adminShortcut"><ShieldCheck size={18} /> Admin</Link> : null}
    {profile?.role === "shipper" ? <Link href="/shipper" className="adminShortcut"><Truck size={18} /> Giao hàng</Link> : null}
  </header>;
}
