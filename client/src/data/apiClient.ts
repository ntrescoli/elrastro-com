import type { Product } from "../types";

export async function fetchProducts(apiUrl: string): Promise<Product[]> {
  const res = await fetch(`${apiUrl}/api/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Product[];
}
