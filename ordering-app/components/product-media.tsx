"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductMedia({ name, imageUrl, position, className = "productImage" }: { name: string; imageUrl: string | null; position?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) return <Image className={className} src={imageUrl} alt={name} width={640} height={420} unoptimized onError={() => setFailed(true)} />;
  return <div className={`${className} menuCrop`} role="img" aria-label={name} style={{ backgroundPosition: position ?? "center" }} />;
}
