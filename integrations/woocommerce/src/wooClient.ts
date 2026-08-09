const baseUrl = (process.env.WOO_URL ?? "").replace(/\/+$/, "");
const consumerKey = process.env.WOO_CONSUMER_KEY ?? "";
const consumerSecret = process.env.WOO_CONSUMER_SECRET ?? "";

if (!baseUrl || !consumerKey || !consumerSecret) {
  throw new Error(
    "Faltan variables WOO_URL, WOO_CONSUMER_KEY y WOO_CONSUMER_SECRET (ver .env.example)",
  );
}

const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;

async function wooRequest<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl}/wp-json/wc/v3${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`WooCommerce ${method} ${path} → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface WooProduct {
  id: number;
  sku: string;
  status: string;
  name: string;
}

export interface WooCategory {
  id: number;
  name: string;
}

const categoryCache = new Map<string, number>();

export async function ensureCategory(name: string): Promise<number> {
  const cached = categoryCache.get(name);
  if (cached !== undefined) return cached;

  const matches = await wooRequest<WooCategory[]>(
    "GET",
    `/products/categories?search=${encodeURIComponent(name)}`,
  );
  const found = matches.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (found) {
    categoryCache.set(name, found.id);
    return found.id;
  }

  const created = await wooRequest<WooCategory>(
    "POST",
    "/products/categories",
    { name },
  );
  categoryCache.set(name, created.id);
  return created.id;
}

export async function findProductBySku(sku: string): Promise<WooProduct | undefined> {
  const list = await wooRequest<WooProduct[]>(
    "GET",
    `/products?sku=${encodeURIComponent(sku)}`,
  );
  return list[0];
}

export async function listPublishedProducts(): Promise<WooProduct[]> {
  const all: WooProduct[] = [];
  let page = 1;
  for (;;) {
    const items = await wooRequest<WooProduct[]>(
      "GET",
      `/products?per_page=100&page=${page}&status=publish`,
    );
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return all;
}

export function createProduct(payload: Record<string, unknown>): Promise<WooProduct> {
  return wooRequest<WooProduct>("POST", "/products", payload);
}

export function updateProduct(
  id: number,
  payload: Record<string, unknown>,
): Promise<WooProduct> {
  return wooRequest<WooProduct>("PUT", `/products/${id}`, payload);
}
