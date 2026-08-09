import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { db } from "../db.js";
import type { Estado, ProductInput, RawRow, SyncSummary } from "../types.js";

const sampleCsv = path.resolve(process.cwd(), "..", "docs", "sample-products.csv");

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

export async function loadSheet(source: string): Promise<RawRow[]> {
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

export function syncFromRows(rows: RawRow[]): SyncSummary {
  const products = normalizeRows(rows);
  const seenSkus = new Set(products.map((p) => p.sku));

  const existsStmt = db.prepare("SELECT id FROM products WHERE sku = ?");
  const insertStmt = db.prepare(
    `INSERT INTO products (sku, nombre, categoria, precio, estado, descripcion, stock, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const updateStmt = db.prepare(
    `UPDATE products
     SET nombre = ?, categoria = ?, precio = ?, estado = ?, descripcion = ?, stock = ?,
         active = 1, updated_at = datetime('now')
     WHERE sku = ?`,
  );

  const sync = () => {
    let created = 0;
    let updated = 0;
    db.exec("BEGIN;");
    try {
      for (const p of products) {
        if (existsStmt.get(p.sku)) {
          updateStmt.run(p.nombre, p.categoria, p.precio, p.estado, p.descripcion, p.stock, p.sku);
          updated++;
        } else {
          insertStmt.run(p.sku, p.nombre, p.categoria, p.precio, p.estado, p.descripcion, p.stock);
          created++;
        }
      }

      const deactivateStmt =
        seenSkus.size === 0
          ? db.prepare("UPDATE products SET active = 0 WHERE active = 1")
          : db.prepare(
              `UPDATE products SET active = 0
               WHERE active = 1 AND sku NOT IN (${Array.from(seenSkus).map(() => "?").join(", ")})`,
            );
      const deactivated = seenSkus.size === 0
        ? Number(deactivateStmt.run().changes)
        : Number(deactivateStmt.run(...Array.from(seenSkus)).changes);

      db.exec("COMMIT;");
      return { created, updated, deactivated };
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  };

  return sync();
}

export async function syncProducts(source: string): Promise<SyncSummary> {
  const rows = await loadSheet(source);
  return syncFromRows(rows);
}

export function resolveDefaultSource(): string {
  return process.env.SHEET_CSV_URL?.trim() || sampleCsv;
}
