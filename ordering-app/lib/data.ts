import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient, createUserClient } from "./supabase/server";
import { fallbackMenu } from "./menu-seed";
import type { CustomerAddress, CustomerProfile, DeliveryEvent, LoyaltyTier, MenuCategory, Order, OrderItem, Product } from "./types";

export const currentUser = cache(async () => {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export async function requireUser(next = "/profile") {
  const user = await currentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(next)}`);
  return user;
}

export async function currentProfile(): Promise<CustomerProfile | null> {
  const user = await currentUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("ordering_profiles").select("*").eq("id", user.id).maybeSingle();
  return data as CustomerProfile | null;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("ordering_profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || data.role !== "admin") redirect("/");
  return { user, profile: data as CustomerProfile, admin };
}

export async function requireShipper() {
  const user = await requireUser("/shipper");
  const admin = createAdminClient();
  const { data } = await admin.from("ordering_profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || data.role !== "shipper") redirect(data?.role === "admin" ? "/admin" : "/");
  return { user, profile: data as CustomerProfile, admin };
}

export async function getMenu(): Promise<MenuCategory[]> {
  try {
    const admin = createAdminClient();
    const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
      admin.from("ordering_categories").select("*").eq("active", true).order("sort_order"),
      admin.from("ordering_products").select("*").eq("active", true).order("sort_order"),
    ]);
    if (categoryError || productError || !categories?.length) return fallbackMenu();
    return categories.map((category) => ({
      ...category,
      products: (products ?? []).filter((product) => product.category_id === category.id),
    })) as MenuCategory[];
  } catch {
    return fallbackMenu();
  }
}

export async function getTiers(): Promise<LoyaltyTier[]> {
  const fallback: LoyaltyTier[] = [
    { id: "member", name: "Thành viên", min_points: 0, discount_percent: 0, color: "#6b756e", active: true },
    { id: "silver", name: "Bạc", min_points: 100, discount_percent: 3, color: "#8d99a6", active: true },
    { id: "gold", name: "Vàng", min_points: 300, discount_percent: 5, color: "#d99b16", active: true },
    { id: "diamond", name: "Kim cương", min_points: 600, discount_percent: 8, color: "#008ba3", active: true },
  ];
  try {
    const { data, error } = await createAdminClient().from("ordering_loyalty_tiers").select("*").eq("active", true).order("min_points");
    return error || !data?.length ? fallback : data as LoyaltyTier[];
  } catch {
    return fallback;
  }
}

export async function customerDashboardData(customerId: string) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: addresses }, { data: orders }, { data: notifications }] = await Promise.all([
    admin.from("ordering_profiles").select("*").eq("id", customerId).single(),
    admin.from("ordering_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }),
    admin.from("ordering_orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
    admin.from("ordering_notifications").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(30),
  ]);
  return {
    profile: profile as CustomerProfile,
    addresses: (addresses ?? []) as CustomerAddress[],
    orders: (orders ?? []) as Order[],
    notifications: notifications ?? [],
  };
}

export async function orderForCustomer(code: string, customerId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("ordering_orders").select("*").eq("code", code).eq("customer_id", customerId).maybeSingle();
  if (!order) return null;
  const [{ data: items }, { data: shipper }] = await Promise.all([
    admin.from("ordering_order_items").select("*").eq("order_id", order.id).order("created_at"),
    order.shipper_id ? admin.from("ordering_profiles").select("id,full_name,phone").eq("id", order.shipper_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  let proofUrl: string | null = null;
  if (order.proof_image_path) {
    const { data } = await admin.storage.from("ordering-delivery-proof").createSignedUrl(order.proof_image_path, 3600);
    proofUrl = data?.signedUrl ?? null;
  }
  return { order: order as Order, items: (items ?? []) as OrderItem[], shipper, proofUrl };
}

export async function adminDashboardData() {
  const { admin } = await requireAdmin();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [{ data: orders }, { data: orderItems }, { data: products }, { data: customers }, { data: shippers }, { data: deliveryEvents }] = await Promise.all([
    admin.from("ordering_orders").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("ordering_order_items").select("*").order("created_at"),
    admin.from("ordering_products").select("*").order("sort_order"),
    admin.from("ordering_profiles").select("*").eq("role", "customer").order("created_at", { ascending: false }),
    admin.from("ordering_profiles").select("*").eq("role", "shipper").order("full_name"),
    admin.from("ordering_delivery_events").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  const allOrders = (orders ?? []) as Order[];
  return {
    orders: allOrders,
    orderItems: (orderItems ?? []) as OrderItem[],
    products: (products ?? []) as Product[],
    customers: (customers ?? []) as CustomerProfile[],
    shippers: (shippers ?? []) as CustomerProfile[],
    deliveryEvents: (deliveryEvents ?? []) as DeliveryEvent[],
    todayOrders: allOrders.filter((order) => new Date(order.created_at) >= since).length,
    todayRevenue: allOrders.filter((order) => new Date(order.created_at) >= since && order.status === "completed").reduce((sum, order) => sum + order.total, 0),
  };
}

export async function adminShipperData() {
  const { admin } = await requireAdmin();
  const [{ data: profiles }, { data: orders }] = await Promise.all([
    admin.from("ordering_profiles").select("*").neq("role", "admin").order("role", { ascending: false }).order("full_name"),
    admin.from("ordering_orders").select("id,shipper_id,shipping_status,cod_collected,delivered_at").not("shipper_id", "is", null),
  ]);
  return { profiles: (profiles ?? []) as CustomerProfile[], orders: (orders ?? []) as Order[] };
}

export async function shipperDashboardData() {
  const { user, profile, admin } = await requireShipper();
  const { data: orders } = await admin.from("ordering_orders").select("*").eq("shipper_id", user.id).order("created_at", { ascending: false }).limit(100);
  const typedOrders = (orders ?? []) as Order[];
  const ids = typedOrders.map((order) => order.id);
  const [{ data: items }, { data: events }] = ids.length ? await Promise.all([
    admin.from("ordering_order_items").select("*").in("order_id", ids).order("created_at"),
    admin.from("ordering_delivery_events").select("*").in("order_id", ids).order("created_at", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  return { profile, orders: typedOrders, items: (items ?? []) as OrderItem[], events: (events ?? []) as DeliveryEvent[] };
}
