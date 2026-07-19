import assert from "node:assert/strict";
import test from "node:test";
import { pointsForOrder, tierForPoints } from "../lib/format";

const tiers = [
  { id: "member", name: "Thành viên", min_points: 0, discount_percent: 0, color: "#7c8b80", active: true },
  { id: "silver", name: "Bạc", min_points: 100, discount_percent: 3, color: "#9ca3af", active: true },
  { id: "gold", name: "Vàng", min_points: 300, discount_percent: 5, color: "#d99b16", active: true },
];

test("10.000 đồng đổi thành 1 điểm, chỉ lấy phần nguyên", () => {
  assert.equal(pointsForOrder(9_999), 0);
  assert.equal(pointsForOrder(10_000), 1);
  assert.equal(pointsForOrder(58_000), 5);
});

test("chọn hạng cao nhất phù hợp với tổng điểm", () => {
  assert.equal(tierForPoints(tiers, 299)?.id, "silver");
  assert.equal(tierForPoints(tiers, 300)?.id, "gold");
});
