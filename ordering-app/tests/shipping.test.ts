import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionShipping } from "../lib/shipping";

test("shipper chỉ đi theo luồng giao hàng hợp lệ", () => {
  assert.equal(canTransitionShipping("assigned", "accept"), true);
  assert.equal(canTransitionShipping("assigned", "delivered"), false);
  assert.equal(canTransitionShipping("accepted", "picked_up"), true);
  assert.equal(canTransitionShipping("picked_up", "delivering"), true);
  assert.equal(canTransitionShipping("delivering", "delivered"), true);
  assert.equal(canTransitionShipping("delivered", "failed"), false);
});

test("đơn giao thất bại có thể giao lại hoặc hoàn thành", () => {
  assert.equal(canTransitionShipping("failed", "delivering"), true);
  assert.equal(canTransitionShipping("failed", "delivered"), true);
  assert.equal(canTransitionShipping("failed", "reject"), false);
});
