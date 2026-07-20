import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "HAMICHEE Ordering", short_name: "HAMICHEE", description: "Đặt món và tích điểm HAMICHEE", start_url: "/", display: "standalone", background_color: "#fbfdfb", theme_color: "#00783e", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" }] };
}
