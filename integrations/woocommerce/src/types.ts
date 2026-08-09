export type Estado = "como nuevo" | "bueno" | "regular";

export interface ProductInput {
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  estado: Estado;
  descripcion: string;
  stock: number;
}

export type RawRow = Record<string, string>;

export interface SyncSummary {
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
}
