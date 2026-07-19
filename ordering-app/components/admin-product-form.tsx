"use client";

import { useState, useTransition } from "react";
import { updateProductAction } from "@/app/actions";
import { ProductMedia } from "./product-media";
import type { Category, Product } from "@/lib/types";

export function AdminProductForm({ product, categories }: { product: Product; categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <form className="adminProduct" action={(data) => startTransition(async () => {
    try { await updateProductAction(data); setMessage("Đã cập nhật, khách hàng sẽ thấy ngay."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể cập nhật"); }
  })}>
    <ProductMedia name={product.name} imageUrl={product.image_url} position={product.image_position} />
    <div className="adminProductFields">
      <input type="hidden" name="id" value={product.id} />
      <input name="name" defaultValue={product.name} required />
      <div className="fieldRow"><select name="categoryId" defaultValue={product.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input name="price" type="number" min="1000" step="1000" defaultValue={product.price} required /></div>
      <label className="fileLabel">Thay ảnh món<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      <div className="checkRow"><label><input name="featured" type="checkbox" defaultChecked={product.featured} /> Bán chạy</label><label><input name="active" type="checkbox" defaultChecked={product.active} /> Đang bán</label></div>
      <button className="primaryButton" disabled={pending}>{pending ? "Đang tải ảnh..." : "Lưu món"}</button>
      {message ? <small>{message}</small> : null}
    </div>
  </form>;
}
