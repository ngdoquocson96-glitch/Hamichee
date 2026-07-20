import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getMenu } from "@/lib/data";

export const metadata: Metadata = { title: "Thực đơn" };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const categories = await getMenu();
  const { category } = await searchParams;
  return <><RealtimeRefresh /><MenuBrowser categories={categories} initialCategory={category} /></>;
}
