import { db } from "../db.js";
import type { ProductRow } from "../types.js";
import { normalize, retrieve } from "./retrieval.js";

export interface ChatResult {
  answer: string;
  products: ProductRow[];
}

const SELECT_ACTIVE = `
  SELECT id, sku, nombre, categoria, precio, estado, descripcion, stock
  FROM products
  WHERE active = 1
`;

function loadProducts(): ProductRow[] {
  return db.prepare(SELECT_ACTIVE).all() as unknown as ProductRow[];
}

function formatHits(hits: ProductRow[]): string {
  return hits
    .map((p) => `• ${p.nombre} — ${p.precio.toFixed(2)}€ (${p.estado}). ${p.descripcion}`)
    .join("\n");
}

export function answerChat(message: string): ChatResult {
  const products = loadProducts();
  const normalized = normalize(message);

  if (products.length === 0) {
    return {
      answer: "El rastro está vacío de momento. Cuando el dueño sincronice el inventario desde Google Sheets, te lo contaré.",
      products: [],
    };
  }

  const isGreeting = ["hola", "buenas", "hey", "saludos", "hello"].some((w) => normalized.includes(w));
  if (isGreeting) {
    return {
      answer: "¡Hola! Soy el bot del rastro y conozco todo lo que hay en el catálogo. Pregúntame, por ejemplo: \"¿tenéis tocadiscos?\" o \"algo de decoración\".",
      products: [],
    };
  }

  const isHelp = ["ayuda", "que puedes", "que sabes", "como funciona", "funciones"].some((w) => normalized.includes(w));
  if (isHelp) {
    return {
      answer: "Puedo buscar en el catálogo por nombre, categoría o descripción. Prueba con: \"música\", \"muebles de madera\", \"cámara analógica\" o \"reloj mecánico\".",
      products: [],
    };
  }

  const isCatalog = ["productos", "catalogo", "inventario", "que tienes", "que hay", "todos", "listado", "lista"].some((w) => normalized.includes(w));
  if (isCatalog) {
    return {
      answer: "Esto es lo que hay ahora mismo en el rastro:\n\n" + formatHits(products.slice(0, 6)),
      products: products.slice(0, 6),
    };
  }

  const hits = retrieve(products, message);
  if (hits.length === 0) {
    return {
      answer: `No encontré nada parecido a "${message}". Prueba con categorías como música, muebles, electrónica, ropa o decoración.`,
      products: [],
    };
  }

  return {
    answer: `Encontré ${hits.length} producto${hits.length > 1 ? "s" : ""} que encaja${hits.length > 1 ? "n" : ""}:\n\n${formatHits(hits)}\n\n¿Te agrupo algo por categoría o precio?`,
    products: hits,
  };
}
