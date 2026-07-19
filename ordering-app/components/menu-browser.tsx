"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { useCart } from "./cart-provider";
import { ProductMedia } from "./product-media";
import { formatCurrency } from "@/lib/format";
import type { MenuCategory, Product } from "@/lib/types";

export function MenuBrowser({ categories, initialCategory }: { categories: MenuCategory[]; initialCategory?: string }) {
  const [categoryId, setCategoryId] = useState(categories.some((item) => item.id === initialCategory) ? initialCategory! : categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [added, setAdded] = useState("");
  const { add } = useCart();
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const products = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    const source = query ? categories.flatMap((item) => item.products) : category?.products ?? [];
    return query ? source.filter((product) => product.name.toLocaleLowerCase("vi").includes(query)) : source;
  }, [categories, category, search]);

  function addProduct(product: Product) {
    const variant = product.variants?.[0];
    add({ productId: product.id, name: product.name, unitPrice: variant?.price ?? product.price, variantLabel: variant?.label, quantity: 1 });
    setAdded(product.id);
    window.setTimeout(() => setAdded(""), 1000);
  }

  return <div className="menuBrowser">
    <div className="searchBox"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm món bạn yêu thích..." /></div>
    <div className="categoryTabs" aria-label="Danh mục món">
      {categories.map((item) => <button key={item.id} className={item.id === category?.id && !search ? "active" : ""} onClick={() => { setSearch(""); setCategoryId(item.id); }}>{item.name}</button>)}
    </div>
    <div className="sectionTitle"><div><h1>{search ? "Kết quả tìm kiếm" : category?.name}</h1><p>{products.length} món đang phục vụ</p></div></div>
    <div className="productGrid">
      {products.map((product) => <article className="productCard" key={product.id}>
        <ProductMedia name={product.name} imageUrl={product.image_url} position={product.image_position ?? category?.image_position} />
        <div className="productBody">
          <h2>{product.name}</h2>
          {product.variants?.length ? <p className="variants">{product.variants.map((item) => `${item.label}: ${formatCurrency(item.price)}`).join(" · ")}</p> : null}
          <div><strong>{formatCurrency(product.price)}</strong><button onClick={() => addProduct(product)} aria-label={`Thêm ${product.name}`} className={added === product.id ? "added" : ""}>{added === product.id ? <Check size={18} /> : <Plus size={18} />}</button></div>
        </div>
      </article>)}
    </div>
  </div>;
}
