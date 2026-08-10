import type { ProductRow } from "../types.js";

const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del",
  "que", "y", "o", "a", "al", "en", "con", "por", "para", "se", "su",
  "me", "mi", "te", "tu", "hay", "tengo", "quiero", "busco", "vendo",
  "compra", "vende", "sobre", "entre", "esta", "este", "algo", "cosas",
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function scoreProduct(product: ProductRow, terms: string[]): number {
  const name = normalize(product.nombre);
  const category = normalize(product.categoria);
  const description = normalize(product.descripcion);
  const state = normalize(product.estado);

  let score = 0;
  for (const term of terms) {
    if (name.includes(term)) score += 3;
    if (category.includes(term)) score += 2;
    if (description.includes(term)) score += 1.5;
    if (state.includes(term)) score += 1;
  }
  return score;
}

export function retrieve(
  products: ProductRow[],
  query: string,
  limit = 3,
): ProductRow[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  return products
    .map((product) => ({ product, score: scoreProduct(product, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}
