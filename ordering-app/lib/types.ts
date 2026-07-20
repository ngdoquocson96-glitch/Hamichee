export type UserRole = "admin" | "customer" | "shipper";
export type OrderStatus = "pending_confirmation" | "confirmed" | "preparing" | "delivering" | "ready_for_pickup" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "reported" | "paid" | "unpaid" | "rejected";
export type ShippingStatus = "unassigned" | "assigned" | "accepted" | "picked_up" | "delivering" | "delivered" | "failed";
export type ShippingAction = "accept" | "reject" | "picked_up" | "delivering" | "delivered" | "failed";

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  image_position: string;
  active: boolean;
};

export type ProductVariant = { label: string; price: number };

export type Product = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string | null;
  image_position: string | null;
  featured: boolean;
  active: boolean;
  variants: ProductVariant[];
  sort_order: number;
};

export type MenuCategory = Category & { products: Product[] };

export type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variantLabel?: string;
};

export type LoyaltyTier = {
  id: string;
  name: string;
  min_points: number;
  discount_percent: number;
  color: string;
  active: boolean;
};

export type CustomerProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  points: number;
  crm_notes: string;
  tags: string[];
  created_at: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  ward: string;
  district: string;
  city: string;
  delivery_note: string;
  is_default: boolean;
};

export type Order = {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  fulfilment_method: "delivery" | "pickup";
  delivery_address: Record<string, string> | null;
  note: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  points_earned: number;
  tier_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipper_id: string | null;
  shipping_status: ShippingStatus;
  shipping_note: string;
  cod_expected: number;
  cod_collected: number;
  proof_image_path: string | null;
  assigned_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryEvent = {
  id: string;
  order_id: string;
  shipper_id: string | null;
  actor_id: string | null;
  event_type: string;
  note: string;
  cod_collected: number;
  proof_image_path: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};
