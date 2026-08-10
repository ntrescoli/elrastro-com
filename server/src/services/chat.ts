import { db } from "../db.js";
import type { ProductRow } from "../types.js";
import { normalize, retrieve } from "./retrieval.js";
import { generateWithLLM, isLLMConfigured } from "./llm.js";

export interface ChatResult {
  answer: string;
  products: ProductRow[];
}

const SYSTEM_PROMPT = `Eres el bot de "elrastro.com", una tienda online de segunda mano con estética de mercadillo.
Responde SIEMPRE en español, con tono cercano y natural.
Utiliza SOLO los productos que te pasan como contexto: no inventes precios, estados ni descripciones.
Menciona el nombre, el precio y el estado de cada producto que recomiendes.
Si el contexto no responde a la pregunta, dilo con honestidad y sugiere categorías del rastro.
Sé breve: 5-6 líneas como máximo.`;

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

export async function answerChat(message: string): Promise<ChatResult> {
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

  if (isLLMConfigured()) {
    const context = JSON.stringify(hits, null, 2);
    try {
      const answer = await generateWithLLM(SYSTEM_PROMPT, `Productos del catálogo:\n${context}\n\nPregunta del cliente: "${message}"`);
      return { answer, products: hits };
    } catch (err) {
      console.error("El LLM falló, usando plantilla:", (err as Error).message);
    }
  }

  return {
    answer: `Encontré ${hits.length} producto${hits.length > 1 ? "s" : ""} que encaja${hits.length > 1 ? "n" : ""}:\n\n${formatHits(hits)}\n\n¿Te agrupo algo por categoría o precio?`,
    products: hits,
  };
}
