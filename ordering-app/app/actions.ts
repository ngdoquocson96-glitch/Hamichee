"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { requireAdmin, requireShipper } from "@/lib/data";
import { pointsForOrder, tierForPoints } from "@/lib/format";
import { canTransitionShipping } from "@/lib/shipping";
import type { CartItem, LoyaltyTier, OrderStatus, PaymentStatus, ProductVariant, ShippingAction, ShippingStatus, UserRole } from "@/lib/types";

const ORDER_STATUSES: OrderStatus[] = ["pending_confirmation", "confirmed", "preparing", "delivering", "ready_for_pickup", "completed", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "reported", "paid", "unpaid", "rejected"];

function value(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function cleanPhone(phone: string) {
  return phone.replace(/[\s.-]/g, "");
}

function validPhone(phone: string) {
  return /^(0\d{9}|\+84\d{9})$/.test(cleanPhone(phone));
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function actionUser() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Vui lòng đăng nhập để tiếp tục");
  return user;
}

export async function updateProfileAction(formData: FormData) {
  const user = await actionUser();
  const fullName = value(formData, "fullName", 120);
  const phone = cleanPhone(value(formData, "phone", 20));
  if (!fullName || !validPhone(phone)) throw new Error("Họ tên hoặc số điện thoại chưa hợp lệ");
  const admin = createAdminClient();
  const { error } = await admin.from("ordering_profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function saveAddressAction(formData: FormData) {
  const user = await actionUser();
  const id = value(formData, "id", 80);
  const payload = {
    customer_id: user.id,
    label: value(formData, "label", 40) || "Địa chỉ nhận hàng",
    recipient_name: value(formData, "recipientName", 120),
    phone: cleanPhone(value(formData, "phone", 20)),
    address_line: value(formData, "addressLine", 250),
    ward: value(formData, "ward", 100),
    district: value(formData, "district", 100),
    city: value(formData, "city", 100),
    delivery_note: value(formData, "deliveryNote", 250),
    is_default: formData.get("isDefault") === "on",
  };
  if (!payload.recipient_name || !validPhone(payload.phone) || !payload.address_line || !payload.ward || !payload.district || !payload.city) {
    throw new Error("Vui lòng nhập đầy đủ địa chỉ và số điện thoại hợp lệ");
  }
  const admin = createAdminClient();
  if (payload.is_default) await admin.from("ordering_addresses").update({ is_default: false }).eq("customer_id", user.id);
  const query = id
    ? admin.from("ordering_addresses").update(payload).eq("id", id).eq("customer_id", user.id)
    : admin.from("ordering_addresses").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/checkout");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await actionUser();
  const id = value(formData, "id", 80);
  const { error } = await createAdminClient().from("ordering_addresses").delete().eq("id", id).eq("customer_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

function makeOrderCode() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  return `HAMI-${date}-${suffix}`;
}

export async function createOrderAction(input: {
  items: CartItem[];
  fulfilmentMethod: "delivery" | "pickup";
  addressId?: string;
  note?: string;
}) {
  try {
    const user = await actionUser();
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error("Giỏ hàng không hợp lệ");
    const normalized = input.items.map((item) => ({
      productId: String(item.productId),
      variantLabel: item.variantLabel ? String(item.variantLabel).slice(0, 80) : undefined,
      quantity: Math.max(1, Math.min(20, Math.floor(Number(item.quantity)))),
    }));
    const admin = createAdminClient();
    const productIds = [...new Set(normalized.map((item) => item.productId))];
    const [{ data: products, error: productError }, { data: profile, error: profileError }, { data: tiers }] = await Promise.all([
      admin.from("ordering_products").select("*").in("id", productIds).eq("active", true),
      admin.from("ordering_profiles").select("*").eq("id", user.id).single(),
      admin.from("ordering_loyalty_tiers").select("*").eq("active", true).order("min_points"),
    ]);
    if (productError || profileError || !profile) throw new Error("Không thể tải thông tin đặt hàng");
    if ((products ?? []).length !== productIds.length) throw new Error("Có món đã ngừng bán, vui lòng tải lại thực đơn");

    const lines = normalized.map((item) => {
      const product = products!.find((row) => row.id === item.productId)!;
      const variants = (product.variants ?? []) as ProductVariant[];
      const variant = item.variantLabel ? variants.find((entry) => entry.label === item.variantLabel) : null;
      if (item.variantLabel && !variant) throw new Error(`Tùy chọn của ${product.name} không còn hợp lệ`);
      const unitPrice = variant?.price ?? Number(product.price);
      return { product, variantLabel: variant?.label ?? null, unitPrice, quantity: item.quantity, lineTotal: unitPrice * item.quantity };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const tier = tierForPoints((tiers ?? []) as LoyaltyTier[], Number(profile.points ?? 0));
    const discountPercent = Number(tier?.discount_percent ?? 0);
    const discountAmount = Math.floor(subtotal * discountPercent / 100);
    const deliveryFee = input.fulfilmentMethod === "delivery" ? 15_000 : 0;
    const total = subtotal - discountAmount + deliveryFee;

    let deliveryAddress: Record<string, string> | null = null;
    if (input.fulfilmentMethod === "delivery") {
      if (!input.addressId) throw new Error("Vui lòng chọn địa chỉ nhận hàng");
      const { data: address } = await admin.from("ordering_addresses").select("*").eq("id", input.addressId).eq("customer_id", user.id).maybeSingle();
      if (!address) throw new Error("Địa chỉ nhận hàng không hợp lệ");
      deliveryAddress = {
        label: address.label,
        recipientName: address.recipient_name,
        phone: address.phone,
        addressLine: address.address_line,
        ward: address.ward,
        district: address.district,
        city: address.city,
        deliveryNote: address.delivery_note,
      };
    }

    let order: { id: string; code: string } | null = null;
    for (let attempt = 0; attempt < 4 && !order; attempt += 1) {
      const { data, error } = await admin.from("ordering_orders").insert({
        code: makeOrderCode(),
        customer_id: user.id,
        customer_name: profile.full_name,
        phone: profile.phone,
        fulfilment_method: input.fulfilmentMethod,
        delivery_address: deliveryAddress,
        note: String(input.note ?? "").trim().slice(0, 500),
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        delivery_fee: deliveryFee,
        total,
        points_earned: pointsForOrder(total),
        tier_name: tier?.name ?? "Thành viên",
      }).select("id,code").single();
      if (!error) order = data;
      else if (error.code !== "23505") throw new Error(error.message);
    }
    if (!order) throw new Error("Không thể tạo mã đơn hàng");

    const { error: itemError } = await admin.from("ordering_order_items").insert(lines.map((line) => ({
      order_id: order!.id,
      product_id: line.product.id,
      product_name: line.product.name,
      variant_label: line.variantLabel,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.lineTotal,
    })));
    if (itemError) {
      await admin.from("ordering_orders").delete().eq("id", order.id);
      throw new Error(itemError.message);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    return { ok: true as const, code: order.code };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Không thể tạo đơn hàng" };
  }
}

export async function reportTransferAction(formData: FormData) {
  const user = await actionUser();
  const code = value(formData, "code", 40);
  const admin = createAdminClient();
  const { error } = await admin.from("ordering_orders").update({ payment_status: "reported" }).eq("code", code).eq("customer_id", user.id).eq("payment_status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath(`/orders/${code}`);
  revalidatePath("/orders");
}

export async function updateOrderAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = value(formData, "id", 80);
  const status = value(formData, "status", 40) as OrderStatus;
  const paymentStatus = value(formData, "paymentStatus", 40) as PaymentStatus;
  if (!ORDER_STATUSES.includes(status) || !PAYMENT_STATUSES.includes(paymentStatus)) throw new Error("Trạng thái không hợp lệ");
  const { error } = await admin.from("ordering_orders").update({ status, payment_status: paymentStatus }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

export async function createShipperAction(formData: FormData) {
  try {
    const { admin } = await requireAdmin();
    const email = value(formData, "email", 200).toLowerCase();
    const password = value(formData, "password", 100);
    const fullName = value(formData, "fullName", 120);
    const phone = cleanPhone(value(formData, "phone", 20));
    if (!validEmail(email) || password.length < 8 || !fullName || !validPhone(phone)) throw new Error("Thông tin tài khoản shipper chưa hợp lệ");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, phone } });
    if (error || !data.user) throw new Error(error?.message ?? "Không thể tạo tài khoản shipper");
    const { error: profileError } = await admin.from("ordering_profiles").update({ full_name: fullName, phone, role: "shipper" }).eq("id", data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(profileError.message);
    }
    revalidatePath("/admin/shippers");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Không thể tạo tài khoản shipper" };
  }
}

export async function updateUserRoleAction(formData: FormData) {
  try {
    const { admin } = await requireAdmin();
    const id = value(formData, "id", 80);
    const role = value(formData, "role", 20) as UserRole;
    if (!id || !["customer", "shipper"].includes(role)) throw new Error("Vai trò không hợp lệ");
    if (role === "customer") {
      const { count } = await admin.from("ordering_orders").select("id", { count: "exact", head: true }).eq("shipper_id", id).in("shipping_status", ["assigned", "accepted", "picked_up", "delivering"]);
      if (count) throw new Error("Shipper còn đơn đang giao, chưa thể chuyển vai trò");
    }
    const { error } = await admin.from("ordering_profiles").update({ role }).eq("id", id).neq("role", "admin");
    if (error) throw new Error(error.message);
    revalidatePath("/admin/shippers");
    revalidatePath("/admin/orders");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Không thể đổi vai trò" };
  }
}

export async function assignShipperAction(formData: FormData) {
  try {
    const { user, admin } = await requireAdmin();
    const orderId = value(formData, "orderId", 80);
    const shipperId = value(formData, "shipperId", 80);
    const codExpected = Math.max(0, Math.floor(Number(formData.get("codExpected") ?? 0)));
    const { data: order } = await admin.from("ordering_orders").select("id,code,status,fulfilment_method,shipper_id").eq("id", orderId).maybeSingle();
    if (!order || order.fulfilment_method !== "delivery" || ["completed", "cancelled"].includes(order.status)) throw new Error("Đơn không thể phân giao");
    if (!shipperId) {
      const { error } = await admin.from("ordering_orders").update({ shipper_id: null, shipping_status: "unassigned", assigned_at: null, status: order.status === "delivering" ? "confirmed" : order.status }).eq("id", orderId);
      if (error) throw new Error(error.message);
      await admin.from("ordering_delivery_events").insert({ order_id: orderId, shipper_id: order.shipper_id, actor_id: user.id, event_type: "unassigned", note: "Admin thu hồi phân công" });
    } else {
      const { data: shipper } = await admin.from("ordering_profiles").select("id").eq("id", shipperId).eq("role", "shipper").maybeSingle();
      if (!shipper) throw new Error("Tài khoản shipper không hợp lệ");
      const { error } = await admin.from("ordering_orders").update({ shipper_id: shipperId, shipping_status: "assigned", assigned_at: new Date().toISOString(), cod_expected: codExpected, cod_collected: 0, proof_image_path: null, delivered_at: null, shipping_note: "", status: order.status === "pending_confirmation" ? "confirmed" : order.status }).eq("id", orderId);
      if (error) throw new Error(error.message);
      await admin.from("ordering_delivery_events").insert({ order_id: orderId, shipper_id: shipperId, actor_id: user.id, event_type: "assigned", note: `Phân đơn ${order.code}` });
    }
    revalidatePath("/admin/orders");
    revalidatePath("/shipper");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Không thể phân shipper" };
  }
}

export async function updateDeliveryAction(formData: FormData) {
  try {
    const { user, admin } = await requireShipper();
    const orderId = value(formData, "orderId", 80);
    const action = value(formData, "deliveryAction", 30) as ShippingAction;
    const note = value(formData, "note", 500);
    const codCollected = Math.max(0, Math.floor(Number(formData.get("codCollected") ?? 0)));
    const { data: order } = await admin.from("ordering_orders").select("*").eq("id", orderId).eq("shipper_id", user.id).maybeSingle();
    if (!order || !canTransitionShipping(order.shipping_status as ShippingStatus, action)) throw new Error("Bước giao hàng không hợp lệ hoặc đơn đã được cập nhật");
    if (["reject", "failed"].includes(action) && !note) throw new Error("Vui lòng ghi rõ lý do");

    const patch: Record<string, unknown> = { shipping_note: note };
    let proofPath: string | null = null;
    if (action === "accept") patch.shipping_status = "accepted";
    if (action === "reject") Object.assign(patch, { shipper_id: null, shipping_status: "unassigned", assigned_at: null, status: "confirmed" });
    if (action === "picked_up") Object.assign(patch, { shipping_status: "picked_up", status: "delivering" });
    if (action === "delivering") Object.assign(patch, { shipping_status: "delivering", status: "delivering" });
    if (action === "failed") Object.assign(patch, { shipping_status: "failed", status: "delivering" });
    if (action === "delivered") {
      const file = formData.get("proof");
      if (!(file instanceof File) || file.size < 1) throw new Error("Cần chụp ảnh xác nhận giao hàng");
      if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Ảnh xác nhận phải là JPG, PNG hoặc WebP và nhỏ hơn 5 MB");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      proofPath = `${user.id}/${order.code}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("ordering-delivery-proof").upload(proofPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      Object.assign(patch, { shipping_status: "delivered", status: "completed", cod_collected: codCollected, proof_image_path: proofPath, delivered_at: new Date().toISOString() });
      if (Number(order.cod_expected) > 0) patch.payment_status = codCollected >= Number(order.cod_expected) ? "paid" : "unpaid";
    }
    const { error } = await admin.from("ordering_orders").update(patch).eq("id", orderId).eq("shipper_id", user.id);
    if (error) throw new Error(error.message);
    await admin.from("ordering_delivery_events").insert({ order_id: orderId, shipper_id: user.id, actor_id: user.id, event_type: action, note, cod_collected: action === "delivered" ? codCollected : 0, proof_image_path: proofPath });
    revalidatePath("/shipper");
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${order.code}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Không thể cập nhật giao hàng" };
  }
}

export async function updateProductAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = value(formData, "id", 120);
  const name = value(formData, "name", 160);
  const categoryId = value(formData, "categoryId", 120);
  const price = Math.max(0, Math.floor(Number(formData.get("price") ?? 0)));
  if (!id || !name || !categoryId || !price) throw new Error("Thông tin món chưa hợp lệ");
  const patch: Record<string, unknown> = {
    name,
    category_id: categoryId,
    price,
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
  };
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn 4 MB");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `products/${id}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from("ordering-menu").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    patch.image_url = admin.storage.from("ordering-menu").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await admin.from("ordering_products").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/menu");
}

export async function updateCustomerCrmAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = value(formData, "id", 80);
  const notes = value(formData, "notes", 2000);
  const tags = value(formData, "tags", 500).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
  const { error } = await admin.from("ordering_profiles").update({ crm_notes: notes, tags }).eq("id", id).eq("role", "customer");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/customers");
}

export async function updateTierAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = value(formData, "id", 80);
  const name = value(formData, "name", 40);
  const minPoints = Math.max(0, Math.floor(Number(formData.get("minPoints") ?? 0)));
  const discountPercent = Math.max(0, Math.min(30, Number(formData.get("discountPercent") ?? 0)));
  if (!name) throw new Error("Tên cấp bậc không được để trống");
  const { error } = await admin.from("ordering_loyalty_tiers").update({ name, min_points: minPoints, discount_percent: discountPercent }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/member");
  revalidatePath("/admin/customers");
}

export async function markNotificationsReadAction() {
  const user = await actionUser();
  await createAdminClient().from("ordering_notifications").update({ read_at: new Date().toISOString() }).eq("customer_id", user.id).is("read_at", null);
  revalidatePath("/profile");
}
