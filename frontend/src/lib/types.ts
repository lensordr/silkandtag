export interface Product {
  id: number;
  code: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  color: string;
  price: number;
  original_price?: number | null;
  status: "available" | "sold" | "reserved" | string;
  image_urls: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  title: string;
  code: string;
  price: number;
}

export interface Order {
  id: number;
  customer_name: string;
  email: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  province: string;
  notes: string;
  status: string;
  payment_provider: string;
  payment_reference: string;
  shipping_provider: string;
  tracking_number: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  promo_code: string;
  total: number;
  created_at: string;
  items: OrderItem[];
  access_token: string;
}

export interface PromoCode {
  id: number;
  code: string;
  instagram_username: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function productImages(p: Product): string[] {
  if (!p.image_urls) return [];
  return p.image_urls.split(",").filter(Boolean);
}
