import fs from "node:fs";
import Papa from "papaparse";
import type { Estado, ProductInput, RawRow, SyncSummary } from "./types.js";
import {
  createProduct,
  ensureCategory,
  findProductBySku,
  listPublishedProducts,
  updateProduct,
} from "./wooClient.js";

function firstValue(row: RawRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) return value;
  }
  return "";
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeRows(rows: RawRow[]): ProductInput[] {
  return rows
    .map((row) => {
      const nombre = firstValue(row, "nombre", "Nombre");
      const estado = firstValue(row, "estado", "Estado").toLowerCase();
      return {
        sku: firstValue(row, "sku", "SKU") || slugify(nombre) || `sin-sku-${Math.random().toString(36).slice(2, 6)}`,
        nombre: nombre || "Producto sin nombre",
        categoria: firstValue(row, "categoria", "Categoria") || "Otros",
        precio: parseFloat(firstValue(row, "precio", "Precio")) || 0,
        estado: (estado === "como nuevo" || estado === "regular" ? estado : "bueno") as Estado,
        descripcion: firstValue(row, "descripcion", "Descripcion"),
        stock: parseInt(firstValue(row, "stock", "Stock")) || 0,
      };
    })
    .filter((p) => p.nombre !== "Producto sin nombre" || p.precio > 0);
}

function toWooPayload(
  p: ProductInput,
  categoryId: number,
): Record<string, unknown> {
  return {
    name: p.nombre,
    sku: p.sku,
    regular_price: p.precio.toFixed(2),
    description: p.descripcion,
    manage_stock: true,
    stock_quantity: p.stock,
    categories: [{ id: categoryId }],
    attributes: [{ name: "Estado", visible: true, options: [p.estado] }],
  };
}

export async function syncFromRows(rows: RawRow[]): Promise<SyncSummary> {
  const products = normalizeRows(rows);
  const seenSkus = new Set(products.map((p) => p.sku));
  const summary: SyncSummary = { created: 0, updated: 0, deactivated: 0, failed: 0 };

  for (const p of products) {
    try {
      const categoryId = await ensureCategory(p.categoria);
      const payload = toWooPayload(p, categoryId);
      const existing = await findProductBySku(p.sku);
      if (existing) {
        await updateProduct(existing.id, payload);
        summary.updated++;
      } else {
        await createProduct(payload);
        summary.created++;
      }
    } catch (err) {
      summary.failed++;
      console.error(`Error con SKU '${p.sku}':`, (err as Error).message);
    }
  }

  const published = await listPublishedProducts();
  for (const product of published) {
    if (product.sku && !seenSkus.has(product.sku)) {
      try {
        await updateProduct(product.id, { status: "draft" });
        summary.deactivated++;
      } catch (err) {
        summary.failed++;
        console.error(`Error desactivando '${product.name}':`, (err as Error).message);
      }
    }
  }

  return summary;
}

async function loadRows(source: string): Promise<RawRow[]> {
  const csvText = /^https?:\/\//.test(source)
    ? await fetch(source).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} al leer la hoja`);
        return res.text();
      })
    : fs.readFileSync(source, "utf-8");

  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV inválido: ${parsed.errors[0].message}`);
  }
  return parsed.data;
}

async function main() {
  const source = process.env.SHEET_CSV_URL?.trim() || process.argv[2];
  if (!source) {
    console.error("Falta SHEET_CSV_URL en .env o pásala como argumento");
    process.exit(1);
  }
  console.log("Sincronizando WooCommerce desde:", source);
  const rows = await loadRows(source);
  const summary = await syncFromRows(rows);
  console.log("Sincronización completada:", summary);
}

main().catch((err) => {
  console.error("Sincronización falló:", (err as Error).message);
  process.exit(1);
});
