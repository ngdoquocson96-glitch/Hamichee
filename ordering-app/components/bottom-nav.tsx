"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Home, ShoppingBag, Soup, UserRound } from "lucide-react";
import { useCart } from "./cart-provider";

const links = [
  { href: "/", label: "Trang chủ", Icon: Home },
  { href: "/menu", label: "Thực đơn", Icon: Soup },
  { href: "/cart", label: "Giỏ hàng", Icon: ShoppingBag },
  { href: "/member", label: "Thành viên", Icon: Gift },
  { href: "/profile", label: "Cá nhân", Icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  if (pathname.startsWith("/admin") || pathname.startsWith("/shipper") || pathname.startsWith("/auth")) return null;
  return <nav className="bottomNav" aria-label="Điều hướng chính">
    {links.map(({ href, label, Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link href={href} key={href} className={active ? "active" : ""}>
        <span className="navIcon"><Icon size={20} />{href === "/cart" && itemCount > 0 ? <b>{itemCount}</b> : null}</span>
        <span>{label}</span>
      </Link>;
    })}
  </nav>;
}
