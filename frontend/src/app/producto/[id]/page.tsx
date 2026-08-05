import type { Metadata } from "next";
import { api, mediaUrl } from "@/lib/api";
import { Product, productImages } from "@/lib/types";
import ProductClient from "./ProductClient";

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    return await api.getProduct(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) {
    return { title: "Producto no encontrado" };
  }
  const images = productImages(product);
  const title = `${product.title}${product.brand ? " · " + product.brand : ""}`;
  const description =
    product.description ||
    `${product.title} en talla ${product.size || "unica"}, estado ${product.condition}. Pieza unica disponible en Silk & Tag.`;

  return {
    title,
    description,
    alternates: { canonical: `/producto/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: images.length > 0 ? [{ url: mediaUrl(images[0]) }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length > 0 ? [mediaUrl(images[0])] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description || undefined,
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        category: product.category || undefined,
        image: productImages(product).map((img) => mediaUrl(img)),
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: product.price,
          availability:
            product.status === "available"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        // eslint-disable-next-line react/no-danger
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductClient />
    </>
  );
}
