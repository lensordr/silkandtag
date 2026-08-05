import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { Product } from "@/lib/types";

const SITE_URL = "https://www.silkandtag.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tienda`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/politica-devoluciones`, changeFrequency: "yearly", priority: 0.3 },
  ];

  let products: Product[] = [];
  try {
    products = await api.listProducts({ status: "available" });
  } catch {
    products = [];
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.id}`,
    lastModified: p.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
