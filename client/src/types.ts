export type Estado = "como nuevo" | "bueno" | "regular";

export interface Product {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  estado: Estado;
  descripcion: string;
  stock: number;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Música: "🎵",
  Ropa: "👕",
  Electrónica: "📻",
  Muebles: "🪑",
  Decoración: "🏺",
  Libros: "📚",
  Otros: "🔍",
};

export const ESTADO_COLOR: Record<Estado, string> = {
  "como nuevo": "var(--moss)",
  bueno: "var(--brass)",
  regular: "var(--stamp)",
};
