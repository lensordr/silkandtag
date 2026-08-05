import type { MetadataRoute } from "next";

const SITE_URL = "https://www.silkandtag.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/checkout", "/carrito", "/pedido"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
