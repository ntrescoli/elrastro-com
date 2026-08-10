import type { Product } from "../types";

export async function fetchProducts(apiUrl: string): Promise<Product[]> {
  const res = await fetch(`${apiUrl}/api/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Product[];
}

export interface ChatResponse {
  answer: string;
  products: Product[];
}

export async function sendChatMessage(
  apiUrl: string,
  message: string,
): Promise<ChatResponse> {
  const res = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ChatResponse;
}
