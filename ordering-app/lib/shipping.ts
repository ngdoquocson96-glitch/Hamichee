import type { ShippingAction, ShippingStatus } from "./types";

export const SHIPPING_TRANSITIONS: Record<ShippingStatus, ShippingAction[]> = {
  unassigned: [],
  assigned: ["accept", "reject"],
  accepted: ["picked_up", "reject"],
  picked_up: ["delivering", "failed"],
  delivering: ["delivered", "failed"],
  delivered: [],
  failed: ["delivering", "delivered"],
};

export function canTransitionShipping(status: ShippingStatus, action: ShippingAction) {
  return SHIPPING_TRANSITIONS[status].includes(action);
}
