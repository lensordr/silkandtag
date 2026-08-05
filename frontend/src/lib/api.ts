export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8020";

export function mediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("silktag_admin_token");
}

export function setAdminToken(token: string) {
  window.localStorage.setItem("silktag_admin_token", token);
}

export function clearAdminToken() {
  window.localStorage.removeItem("silktag_admin_token");
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

async function handle(res: Response) {
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  async listProducts(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/products${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    return handle(res);
  },
  async getProduct(id: number | string) {
    const res = await fetch(`${API_BASE}/api/products/${id}`, { cache: "no-store" });
    return handle(res);
  },
  async createOrder(payload: unknown) {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handle(res);
  },
  async getOrder(id: number | string, accessToken: string) {
    const qs = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
    const res = await fetch(`${API_BASE}/api/orders/${id}${qs}`, { cache: "no-store" });
    return handle(res);
  },
  async payOrder(id: number | string, sourceId: string, accessToken: string) {
    const res = await fetch(`${API_BASE}/api/orders/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: sourceId, access_token: accessToken }),
    });
    return handle(res);
  },

  // Admin
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handle(res);
  },
  async adminListProducts() {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    return handle(res);
  },
  async adminCreateProduct(formData: FormData) {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body: formData,
    });
    return handle(res);
  },
  async adminUpdateProduct(id: number, formData: FormData) {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body: formData,
    });
    return handle(res);
  },
  async adminDeleteProduct(id: number) {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    return handle(res);
  },
  async adminListOrders() {
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    return handle(res);
  },
  async adminUpdateOrder(id: number, payload: unknown) {
    const res = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify(payload),
    });
    return handle(res);
  },
  async adminAnalytics() {
    const res = await fetch(`${API_BASE}/api/admin/analytics`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${getAdminToken()}` },
    });
    return handle(res);
  },
};
