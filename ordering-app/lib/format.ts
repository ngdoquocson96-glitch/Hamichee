import type { LoyaltyTier, OrderStatus, PaymentStatus, ShippingStatus } from "./types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_confirmation: "Chờ xác nhận",
  confirmed: "Đã nhận đơn",
  preparing: "Đang chuẩn bị",
  delivering: "Đang giao",
  ready_for_pickup: "Sẵn sàng nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Chờ chuyển khoản",
  reported: "Khách báo đã chuyển",
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  rejected: "Từ chối xác nhận",
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  unassigned: "Chưa phân shipper",
  assigned: "Đã phân shipper",
  accepted: "Shipper đã nhận đơn",
  picked_up: "Đã lấy hàng",
  delivering: "Đang giao",
  delivered: "Giao thành công",
  failed: "Giao chưa thành công",
};

export const DELIVERY_EVENT_LABELS: Record<string, string> = {
  assigned: "Admin phân đơn",
  unassigned: "Admin thu hồi đơn",
  accept: "Shipper nhận đơn",
  reject: "Shipper từ chối",
  picked_up: "Đã lấy hàng",
  delivering: "Bắt đầu giao",
  delivered: "Giao thành công",
  failed: "Giao chưa thành công",
};

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}đ`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function tierForPoints(tiers: LoyaltyTier[], points: number) {
  return [...tiers]
    .filter((tier) => tier.active && tier.min_points <= points)
    .sort((a, b) => b.min_points - a.min_points)[0] ?? null;
}

export function pointsForOrder(total: number) {
  return Math.max(0, Math.floor(total / 10_000));
}
